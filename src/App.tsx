import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Settings as SettingsIcon, 
  Send, 
  Loader2, 
  User, 
  Bot, 
  X, 
  Save,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import type { Message, Mode, Settings } from "./types";

const INITIAL_MESSAGES: Message[] = [
  { role: "assistant", content: "Hello! I'm your AI assistant. How can I help you today?" }
];

export default function App() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem("ai_app_settings");
    return saved ? JSON.parse(saved) : { huggingFaceKey: "" };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("ai_app_settings", JSON.stringify(newSettings));
    setShowSettings(false);
    setError(null);
  };

  const handleChat = async () => {
    if (!input.trim() || isLoading) return;
    if (!settings.huggingFaceKey) {
      setError("Please add your Hugging Face API key in settings.");
      setShowSettings(true);
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.huggingFaceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen3-8B:nscale",
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to get response from AI");
      }

      const data = await response.json();
      const aiMessage: Message = { 
        role: "assistant", 
        content: data.choices[0].message.content 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageGen = async () => {
    if (!input.trim() || isLoading) return;
    if (!settings.huggingFaceKey) {
      setError("Please add your Hugging Face API key in settings.");
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch(
        "https://router.huggingface.co/nscale/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settings.huggingFaceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            response_format: "b64_json",
            prompt: input,
            model: "stabilityai/stable-diffusion-xl-base-1.0"
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to generate image. Please check your API key.");
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].b64_json) {
          setGeneratedImage(`data:image/png;base64,${data.data[0].b64_json}`);
        } else if (data.data && data.data[0] && data.data[0].url) {
          setGeneratedImage(data.data[0].url);
        } else {
          throw new Error("Unexpected JSON response format from image API.");
        }
      } else {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setGeneratedImage(imageUrl);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while generating the image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "chat") handleChat();
    else handleImageGen();
  };

  return (
    <div className="flex flex-col h-screen bg-[#131314] text-[#e3e3e3] font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#131314]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">Gemini AI Studio</h1>
        </div>

        <div className="flex items-center gap-1 bg-[#1e1e1f] p-1 rounded-full border border-[#2a2a2a]">
          <button
            onClick={() => setMode("chat")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
              mode === "chat" ? "bg-[#2a2a2a] text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMode("image")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
              mode === "image" ? "bg-[#2a2a2a] text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-[#2a2a2a] rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col items-center">
        <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8 scroll-smooth">
          <AnimatePresence mode="wait">
            {mode === "chat" ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-4 max-w-[85%]",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === "user" ? "bg-blue-600" : "bg-[#2a2a2a]"
                    )}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-[#1e1e1f] text-[#e3e3e3] rounded-tl-none border border-[#2a2a2a]"
                    )}>
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 mr-auto max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-[#1e1e1f] border border-[#2a2a2a] rounded-tl-none flex items-center gap-2">
                      <span className="text-sm text-gray-400">Typing</span>
                      <div className="flex gap-1">
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }} 
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-1 h-1 bg-gray-400 rounded-full" 
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className="w-1 h-1 bg-gray-400 rounded-full" 
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className="w-1 h-1 bg-gray-400 rounded-full" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            ) : (
              <motion.div
                key="image"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center min-h-[400px] space-y-6"
              >
                {generatedImage ? (
                  <div className="relative group w-full flex justify-center">
                    <div className="relative overflow-hidden rounded-2xl border border-[#2a2a2a] shadow-2xl">
                      <img 
                        src={generatedImage} 
                        alt="Generated" 
                        className="max-w-full h-auto transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <a 
                          href={generatedImage} 
                          download="generated-ai-image.png"
                          className="px-6 py-3 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-200 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 flex items-center gap-2 shadow-2xl"
                        >
                          <Save className="w-4 h-4" />
                          Download Image
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 bg-[#1e1e1f] rounded-2xl flex items-center justify-center mx-auto border border-[#2a2a2a]">
                      <ImageIcon className="w-8 h-8 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Image Generator</h3>
                      <p className="text-sm text-gray-400">Enter a prompt below to generate a unique image using Stable Diffusion XL.</p>
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-400">Generating your masterpiece...</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-4"
            >
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm backdrop-blur-md">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="flex-1">{error}</p>
                <button onClick={() => setError(null)} className="hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="w-full max-w-3xl p-4 pb-8">
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "chat" ? "Message Gemini..." : "Describe an image..."}
              className="w-full bg-[#1e1e1f] border border-[#2a2a2a] rounded-full py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-2 p-2.5 rounded-full transition-all duration-200",
                input.trim() && !isLoading 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-transparent text-gray-600"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-[10px] text-center mt-3 text-gray-600 uppercase tracking-widest font-medium">
            Gemini AI Studio may display inaccurate info, including about people, so double-check its responses.
          </p>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#1e1e1f] border border-[#2a2a2a] rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-medium">Settings</h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-[#2a2a2a] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hugging Face API Key</label>
                  <input
                    type="password"
                    defaultValue={settings.huggingFaceKey}
                    id="huggingface-key"
                    placeholder="hf_..."
                    className="w-full bg-[#131314] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <p className="text-[10px] text-gray-500 italic">Used for both Chat (Qwen3-8B) and Image Generation (SDXL).</p>
                </div>

                <button
                  onClick={() => {
                    const hfKey = (document.getElementById("huggingface-key") as HTMLInputElement).value;
                    saveSettings({ huggingFaceKey: hfKey });
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
