import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldX, ExternalLink, ChevronDown, ChevronUp, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface AnalysisResult {
  score: number;
  status: "safe" | "suspicious" | "harmful";
  evidence: string[];
  explanation: string;
  nextSteps: string[];
  sources: { title: string; url: string; reliability: number }[];
}

interface CredibilityResultsProps {
  result: AnalysisResult;
}

const CredibilityResults = ({ result }: CredibilityResultsProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "safe":
        return {
          icon: Shield,
          color: "safe",
          label: "Safe",
          description: "Content appears credible"
        };
      case "suspicious":
        return {
          icon: ShieldAlert,
          color: "suspicious",
          label: "Suspicious",
          description: "Content needs verification"
        };
      case "harmful":
        return {
          icon: ShieldX,
          color: "harmful",
          label: "Harmful",
          description: "Content likely contains misinformation"
        };
      default:
        return {
          icon: Shield,
          color: "muted",
          label: "Unknown",
          description: "Unable to determine credibility"
        };
    }
  };

  const statusConfig = getStatusConfig(result.status);
  const StatusIcon = statusConfig.icon;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "safe";
    if (score >= 40) return "suspicious";
    return "harmful";
  };

  return (
    <div className="space-y-6">
      {/* Main Alert */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <Card className={`border-2 border-${statusConfig.color}/20 bg-${statusConfig.color}/5 shadow-medium`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-${statusConfig.color}/10 border border-${statusConfig.color}/20`}>
                <StatusIcon className={`h-8 w-8 text-${statusConfig.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={result.status === "safe" ? "default" : "destructive"} className="font-semibold">
                    {statusConfig.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{statusConfig.description}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Credibility Analysis Complete</h3>
                <p className="text-muted-foreground">{result.explanation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Credibility Score */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              Credibility Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{result.score}%</span>
                <Badge variant="outline" className={`text-${getScoreColor(result.score)}`}>
                  {result.score >= 70 ? "High" : result.score >= 40 ? "Medium" : "Low"} Confidence
                </Badge>
              </div>
              <Progress value={result.score} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Based on cross-referencing with {result.sources.length} reliable sources
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Evidence */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-soft h-fit">
            <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      Evidence Links
                    </div>
                    {showEvidence ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {result.evidence.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-accent/20 border border-accent/30"
                      >
                        <CheckCircle className="h-4 w-4 text-safe mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-soft h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                What To Do Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.nextSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-secondary"
                  >
                    <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sources */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="shadow-soft">
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </div>
                    Source References ({result.sources.length})
                  </div>
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
               </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {result.sources.map((source, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{source.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{source.url}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium">{source.reliability}%</div>
                          <div className="text-xs text-muted-foreground">Reliability</div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>
    </div>
  );
};

export default CredibilityResults;