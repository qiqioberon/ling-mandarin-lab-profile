import { Card, CardContent } from "@/components/ui/card";
import { stats } from "@/data/stats";
import { TrendingUp, Users, Award } from "lucide-react";

const icons = {
  0: TrendingUp,
  1: Users,
  2: Award
};

const TikTokSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* TikTok Embed Placeholder */}
          <div className="bg-card rounded-2xl shadow-lg overflow-hidden aspect-[9/16] max-w-sm mx-auto w-full">
            <div className="flex items-center justify-center h-full bg-muted/50 p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  [TikTok Video Embed Placeholder]
                  <br />
                  Video pembelajaran dari Celine
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Kenapa Pilih Ling Mandarin Lab?
              </h2>
              <p className="text-muted-foreground">
                Belajar dengan metode yang terbukti efektif dan menyenangkan
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              {stats.map((stat, index) => {
                const Icon = icons[index as keyof typeof icons];
                return (
                  <Card key={stat.id} className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-3xl font-bold text-primary mb-1">{stat.value}</p>
                          <p className="font-semibold text-foreground mb-1">{stat.label}</p>
                          <p className="text-sm text-muted-foreground">{stat.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TikTokSection;
