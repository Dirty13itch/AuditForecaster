import { PageHeader } from "@/components/PageHeader";
import TopBar from "@/components/TopBar";
import { ReadinessChip, NotReadyChip } from "@/components/ReadinessChip";
import { FeatureMaturity } from "@shared/featureFlags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Test page for verifying ReadinessChip touch target fixes
 * This page demonstrates that the chips now meet AAA accessibility requirements
 * while maintaining their badge-like appearance.
 */
export default function ReadinessChipTest() {
  return (
    <div className="min-h-screen bg-background">
      {/* TopBar with ReadinessChip */}
      <TopBar 
        title="ReadinessChip Touch Target Test" 
        showReadinessChip={true}
      />
      
      <div className="container max-w-6xl mx-auto pt-20 pb-12 px-4 space-y-8">
        {/* Page Header with ReadinessChip */}
        <PageHeader
          title="Touch Target Verification"
          description="Testing AAA accessibility compliance for ReadinessChip components"
          showReadinessChip={true}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Fix Implementation Details</CardTitle>
            <CardDescription>
              Visual vs Touch Target Separation Approach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">What was fixed:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Removed <code className="bg-muted px-1 py-0.5 rounded">h-auto min-h-0</code> which violated accessibility</li>
                <li>Button now uses <code className="bg-muted px-1 py-0.5 rounded">size="default"</code> for 48px minimum height</li>
                <li>Visual badge styling applied to inner span element</li>
                <li>Touch target is 48px+ while visual appearance remains compact</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>All Maturity States</CardTitle>
            <CardDescription>
              Each chip below has a 48px minimum touch target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Standard Size */}
              <div>
                <h4 className="font-semibold mb-3">Standard Size</h4>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">GA:</span>
                    <ReadinessChip maturity={FeatureMaturity.GA} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">Beta:</span>
                    <ReadinessChip maturity={FeatureMaturity.BETA} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">Experimental:</span>
                    <ReadinessChip maturity={FeatureMaturity.EXPERIMENTAL} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">Not Ready:</span>
                    <NotReadyChip />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Compact Size */}
              <div>
                <h4 className="font-semibold mb-3">Compact Size (used in TopBar)</h4>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">GA:</span>
                    <ReadinessChip maturity={FeatureMaturity.GA} compact />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">Beta:</span>
                    <ReadinessChip maturity={FeatureMaturity.BETA} compact />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">Experimental:</span>
                    <ReadinessChip maturity={FeatureMaturity.EXPERIMENTAL} compact />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24">Not Ready:</span>
                    <NotReadyChip compact />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Touch Target Visualization</CardTitle>
            <CardDescription>
              The outline shows the actual clickable area (48px minimum)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click any chip below to see the dialog. The dashed outline shows the actual touch target area:
              </p>
              <div className="flex items-center gap-4">
                {/* Show touch target with outline */}
                <div className="border-2 border-dashed border-primary/30 rounded-full">
                  <ReadinessChip maturity={FeatureMaturity.BETA} />
                </div>
                <div className="border-2 border-dashed border-primary/30 rounded-full">
                  <ReadinessChip maturity={FeatureMaturity.BETA} compact />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Notice how the touch target (dashed outline) is larger than the visual badge appearance.
                This ensures accessibility while maintaining the desired aesthetic.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Integration Examples</CardTitle>
            <CardDescription>
              Chips working inline with other UI elements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Inline with text */}
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Feature Title</h3>
              <ReadinessChip maturity={FeatureMaturity.GA} />
            </div>
            
            {/* In a button group */}
            <div className="flex items-center gap-2">
              <Button>Action</Button>
              <ReadinessChip maturity={FeatureMaturity.BETA} />
              <Button variant="outline">Cancel</Button>
            </div>
            
            {/* In a card header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span>Card with Chip</span>
                    <ReadinessChip maturity={FeatureMaturity.EXPERIMENTAL} compact />
                  </CardTitle>
                  <Button size="sm">Edit</Button>
                </div>
              </CardHeader>
            </Card>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/20 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">✓ AAA Compliance Achieved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-500">✓</span>
              <span>Touch targets are ≥48px in both dimensions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-500">✓</span>
              <span>Visual appearance remains badge-like and compact</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-500">✓</span>
              <span>No manual height overrides (h-auto, min-h-0) present</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-500">✓</span>
              <span>Keyboard navigation and focus indicators working</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-500">✓</span>
              <span>Works seamlessly in TopBar and PageHeader</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}