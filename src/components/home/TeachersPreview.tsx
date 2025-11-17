import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap } from "lucide-react";
import { teachers } from "@/data/teachers";
import { Link } from "react-router-dom";

const TeachersPreview = () => {
  const previewTeachers = teachers.slice(0, 3);

  return (
    <section id="teachers-preview" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Kenalan dengan Para Laoshi
          </h2>
          <p className="text-lg text-muted-foreground">
            Mentor berpengalaman dan bersertifikat HSK dari Xin Zhong School
          </p>
        </div>

        {/* Teacher Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {previewTeachers.map((teacher) => (
            <Card
              key={teacher.id}
              className="group border-border hover:border-primary/60 hover:shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:-rotate-1 hover:scale-[1.01]"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center transition-colors group-hover:bg-primary/20">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{teacher.name}</h3>
                    <p className="text-sm text-muted-foreground">{teacher.mandarinName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{teacher.education}</p>
                  <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    {teacher.certification}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{teacher.experience}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <Link to="/tentang">
              Lihat Semua Laoshi
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TeachersPreview;
