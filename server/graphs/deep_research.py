from typing import Annotated, Any, Optional
from operator import add
from langgraph.graph import END, StateGraph
from langgraph.types import Send
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_core.messages import AIMessage, AnyMessage
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from duckduckgo_search import DDGS
import time

load_dotenv()


class Analyst(BaseModel):
    """Analyst for research tasks."""

    name: str = Field(description="Name of the analyst")
    role: str = Field(description="Role or specialization of the analyst")
    expertise: str = Field(description="Areas of expertise of the analyst")


class Analysts(BaseModel):
    """List of analyst personas."""

    personas: list[Analyst] = Field(description="List of analyst personas")


class Questions(BaseModel):
    """List of research questions."""

    questions: list[str] = Field(
        description="List of research questions to investigate"
    )


class Answer(BaseModel):
    """Research answer."""

    answer: str = Field(description="Detailed answer to the research questions")


class Body(BaseModel):
    """Research body section."""

    body: str = Field(description="concise body section of the research report")


class Introduction(BaseModel):
    """Research introduction."""

    introduction: str = Field(description="Introduction to the research report")


class Conclusion(BaseModel):
    """Research conclusion."""

    conclusion: str = Field(description="Conclusion to the research report")


class Report(BaseModel):
    """Research report."""

    report: str = Field(description="Final research report")


class ResearchState(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages] = Field(default_factory=list)
    analysts: Annotated[list[Analyst], add] = Field(default_factory=list)
    questions: Annotated[list[str], add] = Field(default_factory=list)
    search_contexts: Annotated[list[str], add] = Field(default_factory=list)
    research: Annotated[list[str], add] = Field(default_factory=list)
    introduction: Optional[str] = Field(default=None)
    body: Optional[str] = Field(default=None)
    conclusion: Optional[str] = Field(default=None)
    report: Optional[str] = Field(default=None)


class AnalystResearchState(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages] = Field(default_factory=list)
    analyst: Analyst = Field(default=None)
    questions: Annotated[list[str], add] = Field(default_factory=list)
    search_contexts: Annotated[list[str], add] = Field(default_factory=list)


def deep_research_agent(state: ResearchState) -> ResearchState:
    """Generate different analyst personas from message history."""
    messages = state.messages

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Analysts)

    message_context = (
        "\n".join([str(msg.content) for msg in messages]) if messages else ""
    )
    prompt = f"Generate 2 different analyst personas with relevant expertise areas.{(f' Based on this conversation:{chr(10)}{message_context}' if message_context else '')}"

    response = structured_llm.invoke(
        [
            SystemMessage(
                content="You are an expert at creating analyst personas for research projects. Generate diverse, well-defined analyst personas with:\n- Specific and relevant expertise areas that match the research topic\n- Clear roles and specializations that complement each other\n- Detailed backgrounds that indicate deep knowledge in their domains\n- Unique perspectives that will provide concise coverage of the topic\n- Professional qualifications that make them credible analysts"
            ),
            HumanMessage(
                content=f"{prompt}\n\nCreate detailed analyst personas with concise expertise descriptions that will enable thorough research from multiple angles."
            ),
        ]
    )
    return {"analysts": response.personas}


def search_for_context(question: str, ddgs: DDGS) -> str:
    """Search for context related to a question."""
    try:
        # Extract key terms from question
        search_query = question
        for prefix in [
            "How do",
            "What are",
            "In what ways",
            "How can",
            "What role",
            "How will",
        ]:
            if search_query.startswith(prefix):
                search_query = search_query[len(prefix) :].strip()
                break

        # Use first 8 words
        words = search_query.split()[:8]
        search_query = " ".join(words)

        # Text search
        results = list(ddgs.text(search_query, max_results=4))

        # Extract context from results
        context_parts = []
        for result in results:
            body = (
                result.get("body", "")
                or result.get("snippet", "")
                or result.get("description", "")
            )
            title = result.get("title", "")
            if body and body.strip():
                context_parts.append(
                    f"{title}\n{body}" if title and title.strip() else body
                )

        return "\n\n".join(context_parts) if context_parts else ""

    except Exception as e:
        return f"Search error: {str(e)}"


def route_to_questions(state: ResearchState) -> list[Send]:
    """Route to generate questions for each analyst using Send commands."""
    return [
        Send(
            "generate_questions",
            AnalystResearchState(
                messages=state.messages,
                analyst=analyst,
                questions=state.questions,
                search_contexts=state.search_contexts,
            ),
        )
        for analyst in state.analysts
    ]


def generate_questions(state: AnalystResearchState) -> AnalystResearchState:

    message_context = (
        "\n".join([str(msg.content) for msg in state.messages])
        if state.messages
        else ""
    )
    analyst_context = f"\n\nYou are {state.analyst.name}, a {state.analyst.role} with expertise in {state.analyst.expertise}. Generate research questions from your specialized perspective."

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Questions)

    response: Questions = structured_llm.invoke(
        [
            SystemMessage(
                content=f"You are an expert research strategist{analyst_context}. Generate concise, well-structured research questions that:\n- Are specific and answerable through research\n- Cover different aspects and dimensions of the topic\n- Require in-depth investigation and analysis\n- Build upon each other to create a concise understanding\n- Address both factual and analytical aspects\n- Lead to actionable insights and conclusions\n- Reflect your unique expertise and perspective"
            ),
            HumanMessage(
                content=f"Generate 2 detailed, well-crafted research questions that will drive thorough investigation from your expertise perspective. Each question should be specific enough to guide concise research while broad enough to uncover important insights.{(f' Conversation history:{chr(10)}{message_context}' if message_context else '')}"
            ),
        ]
    )

    questions = response.questions

    ddgs = DDGS()
    search_contexts = []
    for i, question in enumerate(questions):
        if i > 0:
            time.sleep(1)  # Rate limiting delay
        context = search_for_context(question, ddgs)
        search_contexts.append(context)

    return {"questions": questions, "search_contexts": search_contexts}


def route_to_answers(state: ResearchState) -> list[Send]:
    """Route to generate answers for each analyst using Send commands."""
    num_analysts = len(state.analysts)
    if num_analysts == 0:
        return []

    questions_per_analyst = (
        len(state.questions) // num_analysts if state.questions else 0
    )
    contexts_per_analyst = (
        len(state.search_contexts) // num_analysts if state.search_contexts else 0
    )

    return [
        Send(
            "generate_answer",
            AnalystResearchState(
                messages=state.messages,
                analyst=analyst,
                questions=state.questions[
                    i * questions_per_analyst : (i + 1) * questions_per_analyst
                ],
                search_contexts=state.search_contexts[
                    i * contexts_per_analyst : (i + 1) * contexts_per_analyst
                ],
            ),
        )
        for i, analyst in enumerate(state.analysts)
    ]


def generate_answer(state: AnalystResearchState) -> AnalystResearchState:
    messages = state.messages
    message_context = (
        "\n".join([str(msg.content) for msg in messages]) if messages else ""
    )
    analyst_context = f"\n\nYou are {state.analyst.name}, a {state.analyst.role} with expertise in {state.analyst.expertise}. Generate your analysis from your specialized perspective."

    questions_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(state.questions)])
    contexts_text = "\n\n".join(
        [f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(state.search_contexts)]
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Answer)

    response: Answer = structured_llm.invoke(
        [
            SystemMessage(
                content=f"You are an expert research analyst{analyst_context}. Generate a concise, in-depth answer to the research questions based on the search contexts. Your answer should:\n- Provide thorough analysis from your unique expertise perspective\n- Include detailed explanations and reasoning\n- Synthesize information from all search contexts\n- Address each research question concisely\n- Include relevant examples, evidence, and supporting details\n- Draw connections between different pieces of information\n- Provide nuanced insights and deeper understanding\n- Be well-structured and logically organized"
            ),
            HumanMessage(
                content=f"Research questions to answer in depth:\n{questions_text}\n\nSearch contexts and sources:\n{contexts_text}\n\nGenerate a concise, detailed answer that thoroughly addresses each research question with deep analysis from your expertise perspective, evidence from the sources, and well-reasoned conclusions.{(f' Conversation history:{chr(10)}{message_context}' if message_context else '')}"
            ),
        ]
    )

    return {"research": [response.answer]}


def write_introduction(state: ResearchState) -> ResearchState:
    messages = state.messages
    message_context = (
        "\n".join([str(msg.content) for msg in messages]) if messages else ""
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Introduction)

    response: Introduction = structured_llm.invoke(
        [
            SystemMessage(
                content="You are an expert academic and research writer. Generate a concise, engaging introduction that:\n- Provides rich context and background information\n- Clearly establishes the research topic and its significance\n- Outlines the scope and objectives of the research\n- Introduces key concepts and frameworks\n- Sets up the reader's expectations for the research\n- Uses sophisticated language and academic tone\n- Is detailed enough to stand alone while leading into the main content"
            ),
            HumanMessage(
                content=f"Generate a detailed, concise introduction that thoroughly sets up the research topic, provides essential context, and engages the reader with well-developed background information.{(f' Conversation history:{chr(10)}{message_context}' if message_context else '')}"
            ),
        ]
    )

    return {"introduction": response.introduction}


def write_body(state: ResearchState) -> ResearchState:
    messages = state.messages
    message_context = (
        "\n".join([str(msg.content) for msg in messages]) if messages else ""
    )
    research_text = "\n\n".join(
        [f"Analyst {i+1} Research:\n{res}" for i, res in enumerate(state.research)]
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Body)

    response: Body = structured_llm.invoke(
        [
            SystemMessage(
                content="You are an expert research writer. Generate a concise, well-structured body section that:\n- Organizes the research answer into clear, logical sections\n- Uses proper headings and subheadings for structure\n- Expands on key points with detailed explanations\n- Incorporates evidence from search contexts effectively\n- Maintains academic tone and professional presentation\n- Flows smoothly from one topic to the next\n- Provides thorough coverage of all research questions\n- Includes relevant examples, data, and supporting details"
            ),
            HumanMessage(
                content=f"Research conducted:\n{research_text}\n\nGenerate a detailed, concise body section that transforms the research conducted into a well-structured, professional body with clear organization, detailed explanations, and smooth flow.{(f' Conversation history:{chr(10)}{message_context}' if message_context else '')}"
            ),
        ]
    )

    return {"body": response.body}


def write_conclusion(state: ResearchState) -> ResearchState:
    messages = state.messages
    message_context = (
        "\n".join([str(msg.content) for msg in messages]) if messages else ""
    )
    research_text = "\n\n".join(
        [f"Analyst {i+1} Research:\n{res}" for i, res in enumerate(state.research)]
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Conclusion)

    response: Conclusion = structured_llm.invoke(
        [
            SystemMessage(
                content="You are an expert research analyst and writer. Generate a concise, insightful conclusion that:\n- Synthesizes key findings from the research\n- Provides deep analysis and interpretation of the results\n- Draws meaningful connections between different aspects of the research\n- Offers nuanced insights and implications\n- Addresses the broader significance and impact\n- Identifies patterns, trends, and important takeaways\n- Discusses limitations and areas for future research\n- Provides a strong, memorable closing that reinforces the main points"
            ),
            HumanMessage(
                content=f"Research conducted:\n{research_text}\n\nGenerate a detailed, concise conclusion that thoroughly synthesizes the research findings, provides deep analysis, and offers meaningful insights and implications.{(f'{chr(10)}{chr(10)}Conversation history:{chr(10)}{message_context}' if message_context else '')}"
            ),
        ]
    )

    return {"conclusion": response.conclusion}


def finalize_report(state: ResearchState) -> ResearchState:
    messages = state.messages
    message_context = (
        "\n".join([str(msg.content) for msg in messages]) if messages else ""
    )
    research_text = "\n\n".join(
        [f"Analyst {i+1} Research:\n{res}" for i, res in enumerate(state.research)]
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(Report)

    response: Report = structured_llm.invoke(
        [
            SystemMessage(
                content="You are an expert research report writer and editor. Generate a polished, concise final report that:\n- Seamlessly integrates all sections into a cohesive narrative\n- Maintains consistent tone and style throughout\n- Ensures smooth transitions between introduction, body, and conclusion\n- Enhances clarity and flow of the entire document\n- Adds appropriate formatting and structure for readability\n- Includes executive summary elements where relevant\n- Creates a professional, publication-ready document\n- Ensures all sections work together to tell a complete research story"
            ),
            HumanMessage(
                content=f"Research conducted:\n{research_text}\n\nIntroduction:\n{state.introduction}\n\nBody:\n{state.body}\n\nConclusion:\n{state.conclusion}\n\nGenerate a polished, concise final report that expertly combines all sections into a cohesive, well-structured document with enhanced flow, clarity, and professional presentation.{(f' Conversation history:{chr(10)}{message_context}' if message_context else '')}"
            ),
        ]
    )

    return {"messages": [AIMessage(content=response.report)]}


builder = StateGraph(ResearchState)

builder.add_node("deep_research_agent", deep_research_agent)
builder.add_node("generate_questions", generate_questions)
builder.add_node("generate_answer", generate_answer)
builder.add_node("write_introduction", write_introduction)
builder.add_node("write_body", write_body)
builder.add_node("write_conclusion", write_conclusion)
builder.add_node("finalize_report", finalize_report)

builder.set_entry_point("deep_research_agent")
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

deep_research_graph = builder.compile()
