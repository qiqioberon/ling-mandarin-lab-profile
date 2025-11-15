import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, GraduationCap, MapPin, Award } from "lucide-react";
import { Teacher } from "@/data/teachers";

interface TeacherCardProps {
  teacher: Teacher;
}

const TeacherCard = ({ teacher }: TeacherCardProps) => {
  return (
    <Card className="border-border hover:shadow-lg transition-all">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{teacher.name}</h3>
              <p className="text-muted-foreground">{teacher.mandarinName}</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{teacher.location}</span>
        </div>

        {/* Education */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground flex items-center space-x-2">
            <Award className="w-4 h-4 text-primary" />
            <span>Pendidikan</span>
          </h4>
          <p className="text-sm text-muted-foreground">{teacher.education}</p>
          <p className="text-sm text-muted-foreground">{teacher.degree}</p>
        </div>

        {/* Xin Zhong Background */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">{teacher.xinzhongBackground}</p>
        </div>

        {/* Certification */}
        <div className="inline-block px-4 py-2 bg-primary/10 text-primary font-semibold rounded-lg">
          {teacher.certification}
        </div>

        {/* Experience */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Pengalaman Mengajar</h4>
          <p className="text-sm text-muted-foreground">{teacher.experience}</p>
        </div>

        {/* Certificate */}
        <div className="pt-4 border-t border-border">
          <div className="space-y-3">
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground text-sm px-4">
                [Certificate Thumbnail]
                <br />
                {teacher.name}
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              <a
                href={teacher.certificatePdf}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Lihat Sertifikat (PDF)
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherCard;
