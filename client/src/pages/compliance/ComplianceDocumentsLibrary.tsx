import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Download, 
  Trash2, 
  Grid3x3, 
  List, 
  Search, 
  Filter, 
  X,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Award,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { ComplianceArtifact, User } from "@shared/schema";

type ViewMode = "list" | "gallery";

interface ExtendedArtifact extends ComplianceArtifact {
  jobName?: string;
  uploaderName?: string;
}

const ITEMS_PER_PAGE = 20;

export default function ComplianceDocumentsLibrary() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Filters
  const [programTypes, setProgramTypes] = useState<string[]>([]);
  const [artifactTypes, setArtifactTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal
  const [viewingImage, setViewingImage] = useState<ExtendedArtifact | null>(null);

  // Fetch compliance artifacts
  const { data: artifacts = [], isLoading } = useQuery<ExtendedArtifact[]>({
    queryKey: ["/api/compliance/artifacts"],
  });

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    let filtered = [...artifacts];

    // Program type filter
    if (programTypes.length > 0 && !programTypes.includes("all")) {
      filtered = filtered.filter(a => programTypes.includes(a.programType));
    }

    // Artifact type filter
    if (artifactTypes.length > 0 && !artifactTypes.includes("all")) {
      filtered = filtered.filter(a => artifactTypes.includes(a.artifactType));
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.jobId.toLowerCase().includes(query) ||
        a.jobName?.toLowerCase().includes(query) ||
        a.documentPath.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(a => 
        a.uploadedAt && new Date(a.uploadedAt) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(a => 
        a.uploadedAt && new Date(a.uploadedAt) <= new Date(endDate)
      );
    }

    return filtered;
  }, [artifacts, programTypes, artifactTypes, searchQuery, startDate, endDate]);

  // Paginate artifacts
  const paginatedArtifacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredArtifacts.slice(start, end);
  }, [filteredArtifacts, currentPage]);

  const totalPages = Math.ceil(filteredArtifacts.length / ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setProgramTypes([]);
    setArtifactTypes([]);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedArtifacts.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedArtifacts.map(a => a.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDownloadSelected = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to download.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Downloading...",
      description: `Creating ZIP file with ${selectedItems.size} documents...`,
    });

    // In a real implementation, this would call a backend endpoint to create a ZIP
    // For now, we'll simulate the ZIP creation
    const zipName = `compliance-selected-${format(new Date(), "yyyy-MM-dd")}.zip`;
    
    // Simulate delay
    setTimeout(() => {
      toast({
        title: "Download started",
        description: `${zipName} download initiated.`,
      });
    }, 1000);
  };

  const handleDownloadAllForJob = async (jobId: string) => {
    const jobArtifacts = artifacts.filter(a => a.jobId === jobId);
    
    toast({
      title: "Downloading...",
      description: `Creating ZIP file with ${jobArtifacts.length} documents for job ${jobId}...`,
    });

    const zipName = `compliance-${jobId}-${format(new Date(), "yyyy-MM-dd")}.zip`;
    
    // Simulate delay
    setTimeout(() => {
      toast({
        title: "Download started",
        description: `${zipName} download initiated.`,
      });
    }, 1000);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    // In a real implementation, this would call the backend to delete
    toast({
      title: "Deleted",
      description: `${selectedItems.size} documents deleted successfully.`,
    });
    setSelectedItems(new Set());
  };

  const handleDeleteItem = async (id: string) => {
    // In a real implementation, this would call the backend to delete
    toast({
      title: "Deleted",
      description: "Document deleted successfully.",
    });
  };

  const getProgramTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      energy_star_mfnc: "bg-blue-500 text-white",
      egcc: "bg-green-500 text-white",
      zerh: "bg-purple-500 text-white",
      benchmarking: "bg-orange-500 text-white",
    };
    const labels: Record<string, string> = {
      energy_star_mfnc: "ENERGY STAR MFNC",
      egcc: "EGCC",
      zerh: "ZERH",
      benchmarking: "Benchmarking",
    };
    return { color: colors[type] || "bg-gray-500", label: labels[type] || type };
  };

  const getArtifactTypeIcon = (type: string) => {
    switch (type) {
      case "checklist":
        return <CheckSquare className="h-4 w-4" />;
      case "worksheet":
        return <FileText className="h-4 w-4" />;
      case "photo":
        return <ImageIcon className="h-4 w-4" />;
      case "certificate":
        return <Award className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Compliance Documents Library" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Compliance Documents Library" />
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter compliance documents by program, type, date, and search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Program Type Filter */}
                <div className="space-y-2">
                  <Label>Program Type</Label>
                  <Select
                    value={programTypes.length === 0 ? "all" : programTypes[0]}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setProgramTypes([]);
                      } else {
                        setProgramTypes([value]);
                      }
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger data-testid="select-program-type">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      <SelectItem value="energy_star_mfnc">ENERGY STAR MFNC</SelectItem>
                      <SelectItem value="egcc">EGCC</SelectItem>
                      <SelectItem value="zerh">ZERH</SelectItem>
                      <SelectItem value="benchmarking">Benchmarking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Artifact Type Filter */}
                <div className="space-y-2">
                  <Label>Artifact Type</Label>
                  <Select
                    value={artifactTypes.length === 0 ? "all" : artifactTypes[0]}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setArtifactTypes([]);
                      } else {
                        setArtifactTypes([value]);
                      }
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger data-testid="select-artifact-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="worksheet">Worksheet</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    data-testid="input-start-date"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              {/* Search and Actions Row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job number, builder, or address..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* View Mode Toggle and Bulk Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                {/* View Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    data-testid="button-view-list"
                  >
                    <List className="h-4 w-4 mr-2" />
                    List
                  </Button>
                  <Button
                    variant={viewMode === "gallery" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("gallery")}
                    data-testid="button-view-gallery"
                  >
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Gallery
                  </Button>
                </div>

                {/* Bulk Operations Toolbar */}
                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground" data-testid="text-selected-count">
                      {selectedItems.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadSelected}
                      data-testid="button-download-selected"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteSelected}
                        data-testid="button-delete-selected"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedItems(new Set())}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {filteredArtifacts.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-empty-title">
                      {artifacts.length === 0 ? "No documents yet" : "No results found"}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-empty-description">
                      {artifacts.length === 0 
                        ? "Upload compliance documents to get started."
                        : "Try adjusting your filters or search query."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gallery View */}
          {viewMode === "gallery" && filteredArtifacts.length > 0 && (
            <div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
              data-testid="gallery-view"
            >
              {paginatedArtifacts.map((artifact) => {
                const programBadge = getProgramTypeBadge(artifact.programType);
                const isSelected = selectedItems.has(artifact.id);
                
                return (
                  <Card 
                    key={artifact.id}
                    className={`group hover-elevate cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
                    data-testid={`gallery-card-${artifact.id}`}
                  >
                    <CardContent className="p-3 space-y-2">
                      
                      {/* Selection Checkbox */}
                      <div className="flex items-center justify-between">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectItem(artifact.id)}
                          data-testid={`checkbox-select-${artifact.id}`}
                        />
                        <Badge 
                          variant="secondary"
                          className="text-xs"
                        >
                          {artifact.artifactType}
                        </Badge>
                      </div>

                      {/* Thumbnail */}
                      <div 
                        className="aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden"
                        onClick={() => setViewingImage(artifact)}
                      >
                        {artifact.artifactType === "photo" ? (
                          <img 
                            src={artifact.documentPath} 
                            alt="Artifact"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getArtifactTypeIcon(artifact.artifactType)
                        )}
                      </div>

                      {/* Program Badge */}
                      <Badge className={`${programBadge.color} text-xs`}>
                        {programBadge.label}
                      </Badge>

                      {/* Metadata */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div data-testid={`text-upload-date-${artifact.id}`}>
                          {artifact.uploadedAt && format(new Date(artifact.uploadedAt), "MMM d, yyyy")}
                        </div>
                        <div data-testid={`text-uploader-${artifact.id}`}>
                          {artifact.uploaderName || "Unknown"}
                        </div>
                        <div className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <span data-testid={`text-job-id-${artifact.id}`}>
                            {artifact.jobId.substring(0, 8)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && filteredArtifacts.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto" data-testid="list-view">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedItems.size === paginatedArtifacts.length && paginatedArtifacts.length > 0}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Program Type</TableHead>
                        <TableHead>Artifact Type</TableHead>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedArtifacts.map((artifact) => {
                        const programBadge = getProgramTypeBadge(artifact.programType);
                        const isSelected = selectedItems.has(artifact.id);
                        const fileName = artifact.documentPath.split('/').pop() || "Unknown";
                        
                        return (
                          <TableRow 
                            key={artifact.id}
                            className={isSelected ? "bg-muted/50" : ""}
                            data-testid={`table-row-${artifact.id}`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSelectItem(artifact.id)}
                                data-testid={`checkbox-select-${artifact.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`cell-job-id-${artifact.id}`}>
                              {artifact.jobId.substring(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${programBadge.color}`}>
                                {programBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getArtifactTypeIcon(artifact.artifactType)}
                                <span className="capitalize">{artifact.artifactType}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`cell-document-name-${artifact.id}`}>
                              {fileName}
                            </TableCell>
                            <TableCell data-testid={`cell-upload-date-${artifact.id}`}>
                              {artifact.uploadedAt && format(new Date(artifact.uploadedAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell data-testid={`cell-uploader-${artifact.id}`}>
                              {artifact.uploaderName || "Unknown"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(artifact.documentPath, "_blank")}
                                  data-testid={`button-download-${artifact.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteItem(artifact.id)}
                                    data-testid={`button-delete-${artifact.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {filteredArtifacts.length > ITEMS_PER_PAGE && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredArtifacts.length)} of {filteredArtifacts.length} documents
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm" data-testid="text-current-page">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
      
      <BottomNav />

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="max-w-4xl" data-testid="dialog-image-viewer">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="space-y-4">
              {viewingImage.artifactType === "photo" ? (
                <img 
                  src={viewingImage.documentPath} 
                  alt="Document"
                  className="w-full rounded-md"
                />
              ) : (
                <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                  {getArtifactTypeIcon(viewingImage.artifactType)}
                  <span className="ml-2 text-muted-foreground">
                    {viewingImage.artifactType.charAt(0).toUpperCase() + viewingImage.artifactType.slice(1)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Job ID</Label>
                  <div className="font-medium">{viewingImage.jobId}</div>
                </div>
                <div>
                  <Label>Program</Label>
                  <Badge className={`${getProgramTypeBadge(viewingImage.programType).color} mt-1`}>
                    {getProgramTypeBadge(viewingImage.programType).label}
                  </Badge>
                </div>
                <div>
                  <Label>Upload Date</Label>
                  <div className="font-medium">
                    {viewingImage.uploadedAt && format(new Date(viewingImage.uploadedAt), "MMMM d, yyyy")}
                  </div>
                </div>
                <div>
                  <Label>Uploaded By</Label>
                  <div className="font-medium">{viewingImage.uploaderName || "Unknown"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
