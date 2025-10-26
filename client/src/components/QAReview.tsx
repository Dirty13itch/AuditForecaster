import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ClipboardCheck, 
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Clock,
  ChevronRight,
  Filter,
  Send,
  Eye,
  FileText,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QaInspectionScore } from "@shared/schema";

interface ReviewItem extends QaInspectionScore {
  jobName: string;
  jobAddress: string;
  inspectorName: string;
  submittedAt: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export default function QAReview() {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'needs_improvement' | ''>("");

  // Fetch pending reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery<ReviewItem[]>({
    queryKey: ['/api/qa/scores/review-status/pending', filterStatus, filterPriority],
    enabled: false // Will be enabled when backend is ready
  });

  // Mock data
  const mockReviews: ReviewItem[] = [
    {
      id: "1",
      jobId: "job-1",
      jobName: "123 Main St - Full Inspection",
      jobAddress: "123 Main St, Minneapolis, MN",
      inspectorId: "user-1",
      inspectorName: "John Doe",
      totalScore: 72,
      maxScore: 100,
      percentage: 72,
      grade: "C",
      completenessScore: 85,
      accuracyScore: 65,
      complianceScore: 70,
      photoQualityScore: 75,
      timelinessScore: 65,
      reviewStatus: "pending",
      submittedAt: new Date(),
      priority: 'critical',
      createdAt: new Date()
    },
    {
      id: "2",
      jobId: "job-2",
      jobName: "456 Oak Ave - Blower Door Test",
      jobAddress: "456 Oak Ave, St. Paul, MN",
      inspectorId: "user-2",
      inspectorName: "Jane Smith",
      totalScore: 88,
      maxScore: 100,
      percentage: 88,
      grade: "B",
      completenessScore: 90,
      accuracyScore: 85,
      complianceScore: 88,
      photoQualityScore: 92,
      timelinessScore: 85,
      reviewStatus: "pending",
      submittedAt: new Date(),
      priority: 'medium',
      createdAt: new Date()
    },
    {
      id: "3",
      jobId: "job-3",
      jobName: "789 Pine St - Duct Test",
      jobAddress: "789 Pine St, Bloomington, MN",
      inspectorId: "user-3",
      inspectorName: "Mike Johnson",
      totalScore: 95,
      maxScore: 100,
      percentage: 95,
      grade: "A",
      completenessScore: 98,
      accuracyScore: 92,
      complianceScore: 95,
      photoQualityScore: 96,
      timelinessScore: 94,
      reviewStatus: "pending",
      submittedAt: new Date(),
      priority: 'low',
      createdAt: new Date()
    }
  ];

  const displayReviews = reviews || mockReviews;
  const filteredReviews = displayReviews.filter(review => {
    if (filterPriority !== 'all' && review.priority !== filterPriority) return false;
    return true;
  });

  // Review submission mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({ scoreId, status, notes }: any) => {
      return apiRequest(`/api/qa/scores/${scoreId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes })
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "The inspection review has been submitted successfully"
      });
      setIsReviewDialogOpen(false);
      setSelectedReview(null);
      setReviewNotes("");
      setReviewDecision("");
      queryClient.invalidateQueries({ queryKey: ['/api/qa/scores'] });
    }
  });

  // Bulk review mutation
  const bulkReviewMutation = useMutation({
    mutationFn: async ({ scoreIds, status }: any) => {
      return Promise.all(
        scoreIds.map((id: string) =>
          apiRequest(`/api/qa/scores/${id}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes: "Bulk approved" })
          })
        )
      );
    },
    onSuccess: () => {
      toast({
        title: "Bulk review completed",
        description: `${selectedItems.length} inspections have been reviewed`
      });
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['/api/qa/scores'] });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return "bg-destructive text-destructive-foreground";
      case 'high':
        return "bg-orange-500 text-white";
      case 'medium':
        return "bg-yellow-500 text-white";
      case 'low':
        return "bg-blue-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredReviews.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredReviews.map(r => r.id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const openReviewDialog = (review: ReviewItem) => {
    setSelectedReview(review);
    setIsReviewDialogOpen(true);
  };

  const submitReview = () => {
    if (!selectedReview || !reviewDecision) return;
    
    submitReviewMutation.mutate({
      scoreId: selectedReview.id,
      status: reviewDecision,
      notes: reviewNotes
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">QA Review Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve inspection quality assessments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-2 px-3">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            {filteredReviews.length} Pending
          </Badge>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedItems.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-8" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkReviewMutation.mutate({ scoreIds: selectedItems, status: 'approved' })}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Selected ({selectedItems.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems([])}
              >
                Clear Selection
              </Button>
            </>
          )}
        </div>
        
        <Checkbox
          checked={selectedItems.length === filteredReviews.length && filteredReviews.length > 0}
          onCheckedChange={handleSelectAll}
        />
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {filteredReviews.map(review => (
          <Card key={review.id} className={selectedItems.includes(review.id) ? "ring-2 ring-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedItems.includes(review.id)}
                    onCheckedChange={() => handleSelectItem(review.id)}
                  />
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-base">{review.jobName}</CardTitle>
                      <Badge className={getPriorityColor(review.priority)}>
                        {review.priority}
                      </Badge>
                      <Badge variant="outline">
                        Grade: {review.grade}
                      </Badge>
                    </div>
                    <CardDescription>{review.jobAddress}</CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {review.inspectorName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{review.inspectorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(review.submittedAt, "MMM d, h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(review.totalScore)}`}>
                      {review.totalScore}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReviewDialog(review)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* Score Breakdown */}
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Completeness</p>
                  <p className={`font-medium ${getScoreColor(review.completenessScore)}`}>
                    {review.completenessScore}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className={`font-medium ${getScoreColor(review.accuracyScore)}`}>
                    {review.accuracyScore}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Compliance</p>
                  <p className={`font-medium ${getScoreColor(review.complianceScore)}`}>
                    {review.complianceScore}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Photo Quality</p>
                  <p className={`font-medium ${getScoreColor(review.photoQualityScore)}`}>
                    {review.photoQualityScore}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timeliness</p>
                  <p className={`font-medium ${getScoreColor(review.timelinessScore)}`}>
                    {review.timelinessScore}%
                  </p>
                </div>
              </div>
              
              {review.totalScore < 80 && (
                <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="font-medium">Score below threshold - requires detailed review</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredReviews.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No inspections pending review</p>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Inspection</DialogTitle>
            <DialogDescription>
              {selectedReview?.jobName} - {selectedReview?.jobAddress}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4 py-4">
              {/* Score Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Overall Score</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(selectedReview.totalScore)}`}>
                      {selectedReview.totalScore}%
                    </span>
                    <Badge className="text-lg">{selectedReview.grade}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completeness</span>
                    <span className={getScoreColor(selectedReview.completenessScore)}>
                      {selectedReview.completenessScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Accuracy</span>
                    <span className={getScoreColor(selectedReview.accuracyScore)}>
                      {selectedReview.accuracyScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Compliance</span>
                    <span className={getScoreColor(selectedReview.complianceScore)}>
                      {selectedReview.complianceScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Photo Quality</span>
                    <span className={getScoreColor(selectedReview.photoQualityScore)}>
                      {selectedReview.photoQualityScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Timeliness</span>
                    <span className={getScoreColor(selectedReview.timelinessScore)}>
                      {selectedReview.timelinessScore}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add your review comments, feedback, or required corrections..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              
              {/* Decision Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={reviewDecision === 'approved' ? 'default' : 'outline'}
                  onClick={() => setReviewDecision('approved')}
                  className="justify-start"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant={reviewDecision === 'needs_improvement' ? 'default' : 'outline'}
                  onClick={() => setReviewDecision('needs_improvement')}
                  className="justify-start"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Needs Improvement
                </Button>
              </div>
              
              {/* Additional Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Report
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message Inspector
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={!reviewDecision || submitReviewMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}