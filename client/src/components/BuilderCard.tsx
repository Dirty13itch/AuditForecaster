import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Mail, Phone, MapPin, Briefcase, Edit, Trash2 } from "lucide-react";
import type { Builder } from "@shared/schema";

interface BuilderCardProps {
  builder: Builder;
  onEdit: (builder: Builder) => void;
  onDelete: (builderId: string) => void;
  onViewDetails: (builder: Builder) => void;
}

export function BuilderCard({ builder, onEdit, onDelete, onViewDetails }: BuilderCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    
    return (
      <div className="flex gap-0.5" data-testid={`rating-${builder.id}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? "fill-warning text-warning"
                : "fill-muted text-muted"
            }`}
            data-testid={`star-${i + 1}`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={() => onViewDetails(builder)}
      data-testid={`card-builder-${builder.id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <Avatar className="h-12 w-12 flex-shrink-0" data-testid={`avatar-${builder.id}`}>
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(builder.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight truncate" data-testid={`text-name-${builder.id}`}>
              {builder.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate" data-testid={`text-company-${builder.id}`}>
              {builder.companyName}
            </p>
          </div>
        </div>
        {builder.rating && (
          <div className="flex-shrink-0">
            {renderStars(builder.rating)}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {builder.email && (
          <div className="flex items-center gap-2 text-sm" data-testid={`text-email-${builder.id}`}>
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{builder.email}</span>
          </div>
        )}
        
        {builder.phone && (
          <div className="flex items-center gap-2 text-sm" data-testid={`text-phone-${builder.id}`}>
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{builder.phone}</span>
          </div>
        )}
        
        {builder.address && (
          <div className="flex items-center gap-2 text-sm" data-testid={`text-address-${builder.id}`}>
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{builder.address}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-2">
          {builder.tradeSpecialization && (
            <Badge variant="secondary" className="gap-1" data-testid={`badge-trade-${builder.id}`}>
              <Briefcase className="h-3 w-3" />
              {builder.tradeSpecialization}
            </Badge>
          )}
          
          <Badge variant="outline" data-testid={`badge-jobs-${builder.id}`}>
            {builder.totalJobs || 0} {builder.totalJobs === 1 ? 'Job' : 'Jobs'}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(builder);
          }}
          data-testid={`button-edit-${builder.id}`}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(builder.id);
          }}
          data-testid={`button-delete-${builder.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
