import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import * as Icons from "lucide-react";
import { type AchievementDefinition, getRarityColor, getRarityBackground } from "@/data/achievementDefinitions";
import { type AchievementProgress } from "@/utils/achievementTracker";
import { format } from "date-fns";

interface AchievementCardProps {
  achievement: AchievementDefinition;
  progress?: AchievementProgress;
  compact?: boolean;
  onClick?: () => void;
}

export function AchievementCard({ 
  achievement, 
  progress, 
  compact = false,
  onClick 
}: AchievementCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const Icon = Icons[achievement.icon as keyof typeof Icons] || Icons.Trophy;
  const isUnlocked = progress?.unlocked || false;
  const progressPercentage = progress?.progress || 0;
  const isInProgress = progressPercentage > 0 && !isUnlocked;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowDetails(true);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          className={`
            relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
            ${isUnlocked 
              ? 'border-primary bg-primary/5 hover:bg-primary/10' 
              : 'border-border bg-muted/50 opacity-75 hover:opacity-100'
            }
          `}
          data-testid={`achievement-card-${achievement.id}`}
        >
          <div className={`
            w-12 h-12 flex items-center justify-center rounded-full mb-2
            ${getRarityBackground(achievement.rarity)}
          `}>
            <Icon className={`w-6 h-6 ${getRarityColor(achievement.rarity)}`} />
          </div>
          <p className="text-xs font-medium text-center line-clamp-2">
            {achievement.name}
          </p>
          {isInProgress && !isUnlocked && (
            <div className="absolute bottom-1 left-1 right-1">
              <Progress value={progressPercentage} className="h-1" />
            </div>
          )}
          {isUnlocked && (
            <Icons.CheckCircle className="absolute top-1 right-1 w-4 h-4 text-primary" />
          )}
        </button>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={`
                  w-10 h-10 flex items-center justify-center rounded-full
                  ${getRarityBackground(achievement.rarity)}
                `}>
                  <Icon className={`w-5 h-5 ${getRarityColor(achievement.rarity)}`} />
                </div>
                {achievement.name}
              </DialogTitle>
              <DialogDescription>{achievement.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                  {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                </Badge>
                <Badge variant="outline">
                  +{achievement.xpReward} XP
                </Badge>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {progress.currentValue} / {progress.targetValue}
                    </span>
                  </div>
                  <Progress value={progressPercentage} />
                  {isUnlocked && progress.unlockedAt && (
                    <p className="text-sm text-muted-foreground">
                      Unlocked on {format(new Date(progress.unlockedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Requirements:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {achievement.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Icons.Target className="w-3 h-3" />
                      <span>{req.type.replace(/_/g, ' ')}: {req.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isUnlocked && (
                <div className="bg-primary/10 p-3 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    {achievement.unlockMessage}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all cursor-pointer
        ${isUnlocked ? 'hover-elevate' : 'opacity-75 hover:opacity-100'}
      `}
      onClick={handleClick}
      data-testid={`achievement-card-${achievement.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`
            w-16 h-16 flex items-center justify-center rounded-full flex-shrink-0
            ${getRarityBackground(achievement.rarity)}
          `}>
            <Icon className={`w-8 h-8 ${getRarityColor(achievement.rarity)}`} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{achievement.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
              {isUnlocked && (
                <Icons.CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
              </Badge>
              <Badge variant="outline">
                +{achievement.xpReward} XP
              </Badge>
              <Badge variant="outline">
                {achievement.category.replace(/_/g, ' ')}
              </Badge>
            </div>

            {progress && !isUnlocked && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}

            {isUnlocked && progress?.unlockedAt && (
              <p className="text-xs text-muted-foreground">
                Unlocked {format(new Date(progress.unlockedAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}