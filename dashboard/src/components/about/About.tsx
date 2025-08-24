import { motion } from "framer-motion";
import { Shield, Users, Target, Zap, Database, Brain, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const About = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms analyze content across multiple dimensions to detect misinformation patterns."
    },
    {
      icon: Database,
      title: "Comprehensive Database",
      description: "Cross-references with verified fact-checking databases and reliable news sources in real-time."
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get credibility scores and detailed analysis within seconds of submitting your content."
    },
    {
      icon: Target,
      title: "Accuracy Focused",
      description: "Continuously trained on the latest misinformation trends to maintain high accuracy rates."
    }
  ];

  const stats = [
    { label: "Content Analyzed", value: "1.2M+", description: "Pieces of content fact-checked" },
    { label: "Accuracy Rate", value: "94.7%", description: "Verified accuracy in detection" },
    { label: "Response Time", value: "<3s", description: "Average analysis time" },
    { label: "Sources", value: "500+", description: "Trusted fact-checking sources" }
  ];

  const team = [
    {
      name: "Dr. Sarah Chen",
      role: "AI Research Lead",
      description: "PhD in Machine Learning, former researcher at Stanford AI Lab"
    },
    {
      name: "Marcus Rodriguez",
      role: "Fact-Checking Director",
      description: "15+ years in journalism, former editor at Reuters Fact Check"
    },
    {
      name: "Emily Zhang",
      role: "Product Director",
      description: "Former product lead at social media platform safety teams"
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">About TruthShield</h1>
            <p className="text-muted-foreground">Protecting truth in the digital age</p>
          </div>
        </div>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          TruthShield is an AI-powered misinformation detection platform that helps users verify the credibility 
          of online content. Our mission is to combat the spread of false information by providing instant, 
          accurate analysis of text, images, and links.
        </p>
        
        <div className="flex flex-wrap justify-center gap-3">
          <Badge variant="outline" className="text-sm py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Trusted by 100K+ users
          </Badge>
          <Badge variant="outline" className="text-sm py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            99.9% uptime
          </Badge>
          <Badge variant="outline" className="text-sm py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Real-time updates
          </Badge>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our advanced technology combines multiple analysis techniques to provide comprehensive credibility assessment
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="h-full shadow-soft hover:shadow-medium transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 w-fit mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-medium border-0 bg-primary/5">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Trusted Performance</h2>
              <p className="text-muted-foreground">Real metrics from our platform</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 * index, type: "spring" }}
                  className="text-center"
                >
                  <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.description}</div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Expert Team</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Led by experts in AI, journalism, and digital safety with decades of combined experience
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {team.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                  <p className="text-primary font-medium mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="shadow-strong border-0 bg-gradient-to-br from-primary/5 to-primary-glow/5">
          <CardContent className="p-8 lg:p-12">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                In an era where information travels faster than verification, TruthShield stands as a guardian 
                of digital truth. We believe everyone deserves access to reliable information and the tools to 
                distinguish fact from fiction. Our platform empowers users to make informed decisions by providing 
                instant, transparent credibility analysis backed by cutting-edge AI and trusted sources.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="shadow-glow">
                  Start Fact-Checking
                </Button>
                <Button size="lg" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Learn More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Questions or Feedback?</h2>
          <p className="text-muted-foreground">
            We're constantly improving our platform. Reach out to our team for support or suggestions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline">
              Contact Support
            </Button>
            <Button variant="outline">
              Report an Issue
            </Button>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentation
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default About;