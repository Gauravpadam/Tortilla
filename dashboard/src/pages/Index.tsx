import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import CredibilityChecker from "@/components/credibility/CredibilityChecker";
import TrendingMisinformation from "@/components/trending/TrendingMisinformation";
import SearchHistory from "@/components/history/SearchHistory";
import About from "@/components/about/About";

const Index = () => {
  const [activeTab, setActiveTab] = useState("check");
  const [isDark, setIsDark] = useState(false);

  // Initialize dark mode based on system preference
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", !isDark);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "check":
        return <CredibilityChecker />;
      case "trending":
        return <TrendingMisinformation />;
      case "history":
        return <SearchHistory />;
      case "about":
        return <About />;
      default:
        return <CredibilityChecker />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isDark={isDark} 
        toggleDark={toggleDark} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
