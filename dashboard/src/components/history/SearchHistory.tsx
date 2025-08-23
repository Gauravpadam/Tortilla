import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Search, RotateCcw, Trash2, ExternalLink, Calendar, Shield, ShieldAlert, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface HistoryItem {
  id: string;
  query: string;
  type: "text" | "image" | "link";
  result: {
    score: number;
    status: "safe" | "suspicious" | "harmful";
  };
  timestamp: string;
  url?: string;
}

const mockHistoryData: HistoryItem[] = [
  {
    id: "1",
    query: "COVID-19 vaccine contains microchips for tracking",
    type: "text",
    result: { score: 15, status: "harmful" },
    timestamp: "2 hours ago"
  },
  {
    id: "2",
    query: "https://reliable-news-source.com/article/climate-change-study",
    type: "link",
    result: { score: 92, status: "safe" },
    timestamp: "1 day ago",
    url: "https://reliable-news-source.com/article/climate-change-study"
  },
  {
    id: "3",
    query: "Investment opportunity promising 500% returns",
    type: "text",
    result: { score: 28, status: "suspicious" },
    timestamp: "3 days ago"
  },
  {
    id: "4",
    query: "Celebrity endorsement for miracle weight loss pill",
    type: "image",
    result: { score: 22, status: "harmful" },
    timestamp: "1 week ago"
  },
  {
    id: "5",
    query: "https://medical-journal.org/peer-reviewed-study",
    type: "link",
    result: { score: 88, status: "safe" },
    timestamp: "2 weeks ago",
    url: "https://medical-journal.org/peer-reviewed-study"
  }
];

const SearchHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState(mockHistoryData);

  const filteredHistory = historyData.filter(item =>
    item.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "safe":
        return {
          icon: Shield,
          color: "safe",
          label: "Safe",
          bgClass: "bg-safe/10 border-safe/20"
        };
      case "suspicious":
        return {
          icon: ShieldAlert,
          color: "suspicious",
          label: "Suspicious",
          bgClass: "bg-suspicious/10 border-suspicious/20"
        };
      case "harmful":
        return {
          icon: ShieldX,
          color: "harmful",
          label: "Harmful",
          bgClass: "bg-harmful/10 border-harmful/20"
        };
      default:
        return {
          icon: Shield,
          color: "muted",
          label: "Unknown",
          bgClass: "bg-muted/10 border-muted/20"
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "link":
        return ExternalLink;
      case "image":
        return "🖼️";
      default:
        return "📝";
    }
  };

  const handleRecheck = (item: HistoryItem) => {
    // Simulate re-checking
    console.log("Re-checking:", item.query);
  };

  const handleDelete = (id: string) => {
    setHistoryData(prev => prev.filter(item => item.id !== id));
  };

  const clearAllHistory = () => {
    setHistoryData([]);
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
            <History className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Search History</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Review your past credibility checks and quickly re-analyze content
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {historyData.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAllHistory}
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* History Items */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredHistory.map((item, index) => {
            const statusConfig = getStatusConfig(item.result.status);
            const StatusIcon = statusConfig.icon;
            const TypeIcon = getTypeIcon(item.type);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className={`shadow-soft hover:shadow-medium transition-all duration-300 border-l-4 border-l-${statusConfig.color}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${statusConfig.bgClass} border`}>
                            <StatusIcon className={`h-4 w-4 text-${statusConfig.color}`} />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              {typeof TypeIcon === "string" ? (
                                <span className="text-xs">{TypeIcon}</span>
                              ) : (
                                <TypeIcon className="h-3 w-3" />
                              )}
                              {item.type}
                            </Badge>
                            
                            <Badge 
                              variant="outline" 
                              className={`border-${statusConfig.color} text-${statusConfig.color}`}
                            >
                              {item.result.score}% • {statusConfig.label}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <p className="font-medium text-foreground line-clamp-2 mb-1">
                            {item.query}
                          </p>
                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View original link
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {item.timestamp}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRecheck(item)}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Re-check
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-muted-foreground">
            {historyData.length === 0 ? (
              <>
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No search history yet</p>
                <p>Start analyzing content to see your credibility checks here.</p>
              </>
            ) : (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No history items match your search.</p>
                <p className="text-sm mt-2">Try adjusting your search terms.</p>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats */}
      {historyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-center">Your Analysis Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{historyData.length}</div>
                  <div className="text-sm text-muted-foreground">Total Checks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-safe">
                    {historyData.filter(item => item.result.status === "safe").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Safe Content</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-harmful">
                    {historyData.filter(item => item.result.status === "harmful").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Misinformation</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default SearchHistory;