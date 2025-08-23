import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Link, Type, Scan, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CredibilityResults from "./CredibilityResults";

interface AnalysisResult {
  score: number;
  status: "safe" | "suspicious" | "harmful";
  evidence: string[];
  explanation: string;
  nextSteps: string[];
  sources: { title: string; url: string; reliability: number }[];
}

const CredibilityChecker = () => {
  const [activeInput, setActiveInput] = useState<"text" | "image" | "link">("text");
  const [textInput, setTextInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock result based on input content
    const mockResult: AnalysisResult = {
      score: Math.floor(Math.random() * 100),
      status: ["safe", "suspicious", "harmful"][Math.floor(Math.random() * 3)] as any,
      evidence: [
        "Cross-referenced with 5 reliable news sources",
        "Fact-checking databases show no contradictions",
        "Author has verified credentials"
      ],
      explanation: "This content appears to be factually accurate based on our analysis of multiple reliable sources and verification databases.",
      nextSteps: [
        "Consider checking additional sources for complete context",
        "Look for recent updates on this topic",
        "Verify specific claims with primary sources"
      ],
      sources: [
        { title: "Reuters Fact Check", url: "https://reuters.com", reliability: 95 },
        { title: "AP News Verification", url: "https://apnews.com", reliability: 92 },
        { title: "BBC Reality Check", url: "https://bbc.com", reliability: 90 }
      ]
    };
    
    setResult(mockResult);
    setIsAnalyzing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload logic here
      console.log("File uploaded:", file.name);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-medium border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Check Content Credibility</h2>
                <p className="text-muted-foreground">
                  Analyze text, images, or links for misinformation and credibility
                </p>
              </div>

              <Tabs value={activeInput} onValueChange={(value) => setActiveInput(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Link
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter text to analyze</label>
                    <Textarea
                      placeholder="Paste the content you want to fact-check here..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="min-h-32 resize-none"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{textInput.length} characters</span>
                      <span>Max 5,000 characters</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upload an image</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Drop an image here or click to browse
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button variant="outline" onClick={() => document.getElementById('image-upload')?.click()}>
                        <FileText className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="link" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter URL to analyze</label>
                    <Input
                      placeholder="https://example.com/article"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      type="url"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (!textInput && !linkInput)}
                  className="w-full bg-primary hover:bg-primary/90 shadow-glow"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Scan className="h-4 w-4" />
                      </motion.div>
                      Analyzing Content...
                    </motion.div>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Check Credibility
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Section */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CredibilityResults result={result} />
        </motion.div>
      )}
    </div>
  );
};

export default CredibilityChecker;