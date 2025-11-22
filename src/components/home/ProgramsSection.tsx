import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle } from "lucide-react";
import { programs } from "@/data/programs";
import { whatsappUrl } from "@/data/stats";

const ProgramsSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Program Ling Chinese Lab
          </h2>
          <p className="text-lg text-muted-foreground">
            Pilih level yang sesuai dengan kemampuan Anda. Setiap program dirancang untuk hasil maksimal.
          </p>
        </div>

        {/* Program Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {programs.map((program) => (
            <Card key={program.id} className="border-border hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                    {program.level}
                  </span>
                </div>
                <CardTitle className="text-xl">{program.title}</CardTitle>
                <CardDescription>{program.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {program.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <Card className="border-primary/20 bg-muted/30">
            <CardContent className="py-8">
              <p className="text-muted-foreground mb-4">
                💬 Harga dan jadwal dikirimkan secara personal via WhatsApp
              </p>
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Tanya Program lewat WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ProgramsSection;
