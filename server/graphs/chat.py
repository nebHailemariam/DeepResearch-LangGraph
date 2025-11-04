from enum import Enum
from typing import Annotated, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_core.messages import AnyMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from graphs.deep_research import deep_research_graph

load_dotenv()


class Route(str, Enum):
    """Route types for research."""

    DEEP_RESEARCH = "deep_research"
    QUICK_REPLY = "quick_reply"


class RouteDecision(BaseModel):
    """Routing decision for research type."""

    route: Route = Field(description="Route to take: deep_research or quick_reply")
    title: Optional[str] = Field(default=None)


class QuickReply(BaseModel):
    """Quick reply response."""

    reply: str = Field(description="Quick reply to the question")


class ChatState(BaseModel):
    title: Optional[str] = Field(default=None)
    messages: Annotated[list[AnyMessage], add_messages] = Field(default_factory=list)
    router_next: Optional[Route] = Field(default=None)


def chat_agent(state: ChatState) -> ChatState:
    """Start node that decides the next step to take."""
    messages = state.messages

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(RouteDecision)

    last_message = messages[-1].content if messages else ""

    response = structured_llm.invoke(
        [
            SystemMessage(
                content="You are a routing agent. Decide whether the question requires deep research or can be answered with a quick reply and generate the title of the topic."
            ),
            HumanMessage(
                content=f"Question: {last_message}\n\nShould this require deep research or quick reply?"
            ),
        ]
    )

    return {"router_next": response.route, "title": response.title}


def quick_reply_agent(state: ChatState) -> ChatState:
    """Quick reply agent that provides a quick answer."""
    messages = state.messages

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(QuickReply)

    last_message = messages[-1].content if messages else ""

    response = structured_llm.invoke(
        [
            SystemMessage(
                content="You are a helpful assistant. Provide a quick, concise reply to the question."
            ),
            HumanMessage(content=f"Question: {last_message}"),
        ]
    )

    new_messages = state.messages + [AIMessage(content=response.reply)]
    return {"messages": new_messages, "router_next": None}


def route_from_router(state: ChatState) -> Route:
    """Route based on router_next field."""
    return state.router_next or Route.QUICK_REPLY


builder = StateGraph(ChatState)

builder.add_node("chat_agent", chat_agent)
builder.add_node("quick_reply_agent", quick_reply_agent)
builder.add_node("deep_research", deep_research_graph)

builder.set_entry_point("chat_agent")
builder.add_conditional_edges(
    "chat_agent",
    route_from_router,
    {
        Route.DEEP_RESEARCH: "deep_research",
        Route.QUICK_REPLY: "quick_reply_agent",
    },
)
builder.add_edge("quick_reply_agent", END)
builder.add_edge("deep_research", END)

chat_graph = builder.compile()
