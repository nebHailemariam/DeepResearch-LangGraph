from enum import Enum
from typing import Annotated, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_core.messages import AnyMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from graphs.deep_research import (
    deep_research_agent,
    route_to_questions,
    generate_questions,
    route_to_answers,
    generate_answer,
    write_introduction,
    write_body,
    write_conclusion,
    finalize_report,
)

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
    tool_message = ToolMessage(
        content="Analyzing question...",
        tool_call_id="chat_agent",
    )

    messages = state.messages

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(RouteDecision)

    last_message = messages[-1].content if messages else ""

    modified_config = RunnableConfig(tags=["nostream"])

    response = structured_llm.invoke(
        [
            SystemMessage(
                content="You are a routing agent. Decide whether the question requires deep research or can be answered with a quick reply. Generate a concise, descriptive title (3-8 words) that captures the topic, not the exact question. For example: 'AI Trends 2024' instead of 'What are the latest trends in AI research in 2024?'"
            ),
            HumanMessage(
                content=f"Question: {last_message}\n\nShould this require deep research or quick reply? Generate a concise title for this topic."
            ),
        ],
        config=modified_config,
    )

    return {
        "router_next": response.route,
        "title": response.title if not state.title else state.title,
        "messages": [tool_message],
    }


def quick_reply_agent(state: ChatState) -> ChatState:
    """Quick reply agent that provides a quick answer with streaming."""
    tool_message = ToolMessage(
        content="Generating quick reply...",
        tool_call_id="quick_reply_agent",
    )

    messages = state.messages

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    stream = llm.stream(
        [
            SystemMessage(
                content="You are a helpful assistant. Provide a quick, concise reply to the question."
            ),
        ]
        + [msg for msg in messages if msg.type in ["human", "ai"]]
    )

    full_response = ""
    for chunk in stream:
        if hasattr(chunk, "content") and chunk.content:
            full_response += chunk.content

    new_messages = state.messages + [AIMessage(content=full_response)]
    return {"messages": new_messages, "router_next": None}


def route_from_router(state: ChatState) -> Route:
    """Route based on router_next field."""
    return state.router_next or Route.QUICK_REPLY


builder = StateGraph(ChatState)

# Add chat nodes
builder.add_node("chat_agent", chat_agent)
builder.add_node("quick_reply_agent", quick_reply_agent)

# Add deep research nodes
builder.add_node("deep_research_agent", deep_research_agent)
builder.add_node("generate_questions", generate_questions)
builder.add_node("generate_answer", generate_answer)
builder.add_node("write_introduction", write_introduction)
builder.add_node("write_body", write_body)
builder.add_node("write_conclusion", write_conclusion)
builder.add_node("finalize_report", finalize_report)

# Set entry point
builder.set_entry_point("chat_agent")

# Main routing
builder.add_conditional_edges(
    "chat_agent",
    route_from_router,
    {
        Route.DEEP_RESEARCH: "deep_research_agent",
        Route.QUICK_REPLY: "quick_reply_agent",
    },
)

# Quick reply path
builder.add_edge("quick_reply_agent", END)

# Deep research path
builder.add_conditional_edges(
    "deep_research_agent",
    route_to_questions,
    {
        "generate_questions": "generate_questions",
    },
)
builder.add_conditional_edges(
    "generate_questions",
    route_to_answers,
    {
        "generate_answer": "generate_answer",
    },
)
builder.add_edge("generate_answer", "write_introduction")
builder.add_edge("generate_answer", "write_body")
builder.add_edge("generate_answer", "write_conclusion")
builder.add_edge("write_introduction", "finalize_report")
builder.add_edge("write_body", "finalize_report")
builder.add_edge("write_conclusion", "finalize_report")
builder.add_edge("finalize_report", END)

chat_graph = builder.compile()
