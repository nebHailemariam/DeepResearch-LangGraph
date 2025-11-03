"use client";
import Chat from "@/components/Chat/Chat";
import ChatMessage from "@/components/ChatMessage/ChatMessage";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { Message } from "@/types/types";

export default function page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const messages: Message[] = [
      {
        id: "1",
        type: "user",
        text: "Hello, can you help me with research?",
        timestamp: "11:46",
      },
      {
        id: "2",
        type: "AI",
        text: "Hello! I'd be happy to help you with research. What topic would you like to explore?",
        timestamp: "11:47",
      },
      {
        id: "3",
        type: "user",
        text: "I'm interested in learning about artificial intelligence and machine learning.",
        timestamp: "11:48",
      },
      {
        id: "4",
        type: "AI",
        text: "Great topic! Artificial intelligence (AI) is a broad field that encompasses machine learning, deep learning, natural language processing, and more. Machine learning is a subset of AI that focuses on algorithms that can learn from data.",
        timestamp: "11:49",
      },
      {
        id: "5",
        type: "user",
        text: "What are the key differences between supervised and unsupervised learning?",
        timestamp: "11:50",
      },
      {
        id: "6",
        type: "AI",
        text: "Supervised learning uses labeled data to train models, meaning the algorithm learns from examples with known outcomes. Unsupervised learning works with unlabeled data, finding patterns and structures without predefined labels.",
        timestamp: "11:51",
      },
      {
        id: "7",
        type: "user",
        text: "That makes sense. Can you recommend some good resources to learn more?",
        timestamp: "11:52",
      },
      {
        id: "8",
        type: "AI",
        text: "Certainly! I'd recommend starting with online courses like Andrew Ng's Machine Learning course on Coursera, reading books like 'Hands-On Machine Learning' by Aurélien Géron, and practicing with datasets on Kaggle.",
        timestamp: "11:53",
      },
      {
        id: "9",
        type: "user",
        text: "Thanks for the recommendations! I'll check those out.",
        timestamp: "11:54",
      },
      {
        id: "10",
        type: "AI",
        text: "You're welcome! Feel free to ask if you have any more questions about AI or machine learning. Good luck with your learning journey!",
        timestamp: "11:55",
      },
      {
        id: "11",
        type: "user",
        text: "Actually, I have another question. What programming languages are best for machine learning?",
        timestamp: "11:56",
      },
      {
        id: "12",
        type: "AI",
        text: "Python is the most popular language for machine learning due to its simplicity and extensive libraries like TensorFlow, PyTorch, scikit-learn, and pandas. R is also widely used for statistical analysis, and Julia is gaining traction for high-performance computing.",
        timestamp: "11:57",
      },
      {
        id: "13",
        type: "user",
        text: "I'm familiar with Python. Should I start with TensorFlow or PyTorch?",
        timestamp: "11:58",
      },
      {
        id: "14",
        type: "AI",
        text: "Both are excellent choices! PyTorch is often preferred by researchers for its dynamic computation graphs and Pythonic design, while TensorFlow is widely used in production. I'd suggest starting with PyTorch for learning, then exploring TensorFlow once you're comfortable.",
        timestamp: "11:59",
      },
      {
        id: "15",
        type: "user",
        text: "What about deep learning? How does it relate to machine learning?",
        timestamp: "12:00",
      },
      {
        id: "16",
        type: "AI",
        text: "Deep learning is a subset of machine learning that uses neural networks with multiple layers (hence 'deep'). It's particularly powerful for tasks like image recognition, natural language processing, and speech recognition. Deep learning models can automatically learn features from raw data.",
        timestamp: "12:01",
      },
      {
        id: "17",
        type: "user",
        text: "That's really interesting! Can you give me an example of a real-world application?",
        timestamp: "12:02",
      },
      {
        id: "18",
        type: "AI",
        text: "Sure! Examples include: recommendation systems (Netflix, Amazon), image recognition in medical diagnostics, autonomous vehicles using computer vision, voice assistants like Siri and Alexa, and language translation services. These all rely heavily on deep learning.",
        timestamp: "12:03",
      },
      {
        id: "19",
        type: "user",
        text: "Wow, AI is everywhere! What's the future of AI looking like?",
        timestamp: "12:04",
      },
      {
        id: "20",
        type: "AI",
        text: "The future looks very promising! We're seeing advances in areas like GPT models for natural language understanding, reinforcement learning for complex decision-making, and AI ethics becoming increasingly important. The integration of AI into various industries will continue to accelerate.",
        timestamp: "12:05",
      },
    ];
    setMessages(messages);
  }, []);
  return (
    <div>
      <button
        className={styles.menuButton}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg
          className={styles.menuIcon}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.mainContent}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            id={message.id}
            text={message.text}
            type={message.type}
            timestamp={message.timestamp}
          />
        ))}

        <Chat />
      </div>
    </div>
  );
}
