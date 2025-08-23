import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Search, Filter, Calendar, ExternalLink, AlertTriangle, Shield, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TrendingItem {
  id: string;
  title: string;
  category: "scam" | "health" | "politics" | "finance" | "technology";
  severity: "low" | "medium" | "high";
  description: string;
  timestamp: string;
  views: number;
  sources: number;
  explanation: string;
  tags: string[];
}

const mockTrendingData: TrendingItem[] = [
  {
    id: "1",
    title: "Fake Investment App Targeting Social Media Users",
    category: "finance",
    severity: "high",
    description: "A sophisticated phishing app is circulating on social media platforms, promising unrealistic returns on cryptocurrency investments.",
    timestamp: "2 hours ago",
    views: 15420,
    sources: 8,
    explanation: "This app has been confirmed as fraudulent by multiple financial authorities. It uses fake testimonials and manipulated charts to lure victims.",
    tags: ["cryptocurrency", "phishing", "social media", "investment fraud"]
  },
  {
    id: "2",
    title: "Misleading Health Claims About New Supplement",
    category: "health",
    severity: "medium",
    description: "Viral posts claiming a new supplement can cure multiple diseases without FDA approval or scientific backing.",
    timestamp: "4 hours ago",
    views: 8930,
    sources: 5,
    explanation: "No peer-reviewed studies support these claims. The supplement has not been evaluated by the FDA.",
    tags: ["health", "supplements", "medical misinformation", "FDA"]
  },
  {
    id: "3",
    title: "Doctored Political Video Goes Viral",
    category: "politics",
    severity: "high",
    description: "A deepfake video of a political figure making inflammatory statements is spreading across platforms.",
    timestamp: "6 hours ago",
    views: 24680,
    sources: 12,
    explanation: "Video analysis confirms digital manipulation. The original footage has been altered using AI technology.",
    tags: ["deepfake", "politics", "video manipulation", "disinformation"]
  }
];

const TrendingMisinformation = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);

  const filteredData = mockTrendingData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      scam: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      health: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      politics: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      finance: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      technology: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return { color: "harmful", icon: AlertTriangle };
      case "medium":
        return { color: "suspicious", icon: Shield };
      case "low":
        return { color: "safe", icon: Shield };
      default:
        return { color: "muted", icon: Shield };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Trending Misinformation</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Stay informed about the latest misinformation campaigns, scams, and false claims circulating online
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search misinformation alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="scam">Scams</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="politics">Politics</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trending Items */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredData.map((item, index) => {
            const severityConfig = getSeverityConfig(item.severity);
            const SeverityIcon = severityConfig.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                layout
              >
                <Card className="shadow-soft hover:shadow-medium transition-all duration-300 border-l-4 border-l-harmful">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getCategoryColor(item.category)} variant="secondary">
                              {item.category}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`border-${severityConfig.color} text-${severityConfig.color}`}
                            >
                              <SeverityIcon className="h-3 w-3 mr-1" />
                              {item.severity} risk
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {item.timestamp}
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-semibold leading-tight">{item.title}</h3>
                          <p className="text-muted-foreground">{item.description}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-right space-y-2 flex-shrink-0">
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {item.views.toLocaleString()} views
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <ExternalLink className="h-3 w-3" />
                              {item.sources} sources
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                          Verified by {item.sources} fact-checking sources
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-left">{item.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <Badge className={getCategoryColor(item.category)} variant="secondary">
                                  {item.category}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`border-${severityConfig.color} text-${severityConfig.color}`}
                                >
                                  <SeverityIcon className="h-3 w-3 mr-1" />
                                  {item.severity} risk
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold">Description</h4>
                                <p className="text-muted-foreground">{item.description}</p>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold">Detailed Analysis</h4>
                                <p className="text-muted-foreground">{item.explanation}</p>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold">Related Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                  {item.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t border-border text-sm text-muted-foreground">
                                <div>First detected: {item.timestamp}</div>
                                <div>Views: {item.views.toLocaleString()}</div>
                                <div>Fact-checked by {item.sources} sources</div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredData.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No misinformation alerts match your search criteria.</p>
            <p className="text-sm mt-2">Try adjusting your filters or search terms.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TrendingMisinformation;