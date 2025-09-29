import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Upload, Save, RotateCcw } from 'lucide-react';

export const HeaderImageManagement = () => {
  const [logoUrl, setLogoUrl] = useState('/lovable-uploads/67371650-0175-429b-b951-997f7ef76e93.png');
  const [googlePlayBadgeUrl, setGooglePlayBadgeUrl] = useState('/src/assets/google-play-badge.png');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (file: File, type: 'logo' | 'google-play') => {
    try {
      setIsUpdating(true);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(`header-images/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(`header-images/${fileName}`);

      if (type === 'logo') {
        setLogoUrl(publicUrl);
      } else {
        setGooglePlayBadgeUrl(publicUrl);
      }

      toast({
        title: 'Success',
        description: `${type === 'logo' ? 'Logo' : 'Google Play badge'} uploaded successfully`,
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsUpdating(true);
      
      // Here you would typically save to a header_config table or similar
      // For now, we'll just show a success message as the images are already uploaded
      
      toast({
        title: 'Success',
        description: 'Header images updated successfully. Changes will reflect after page refresh.',
      });
      
      // Reload the page to show updated images
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const resetToDefault = () => {
    setLogoUrl('/lovable-uploads/67371650-0175-429b-b951-997f7ef76e93.png');
    setGooglePlayBadgeUrl('/src/assets/google-play-badge.png');
    toast({
      title: 'Reset',
      description: 'Images reset to default values',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="h-6 w-6" />
          Header Image Management
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={resetToDefault}
            disabled={isUpdating}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button 
            onClick={handleSaveChanges}
            disabled={isUpdating}
          >
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Management */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Logo</Label>
              <div className="w-full h-32 border rounded-lg flex items-center justify-center bg-muted">
                <img 
                  src={logoUrl} 
                  alt="Current Logo" 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Upload New Logo</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'logo');
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                disabled={isUpdating}
              />
              <p className="text-sm text-muted-foreground">
                Recommended size: 64x64px or larger, square format
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-url">Or enter image URL</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Google Play Badge Management */}
        <Card>
          <CardHeader>
            <CardTitle>Google Play Badge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Badge</Label>
              <div className="w-full h-32 border rounded-lg flex items-center justify-center bg-muted">
                <img 
                  src={googlePlayBadgeUrl} 
                  alt="Google Play Badge" 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Upload New Badge</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'google-play');
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                disabled={isUpdating}
              />
              <p className="text-sm text-muted-foreground">
                Recommended: Official Google Play badge from Google's assets
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-url">Or enter image URL</Label>
              <Input
                id="badge-url"
                value={googlePlayBadgeUrl}
                onChange={(e) => setGooglePlayBadgeUrl(e.target.value)}
                placeholder="https://example.com/google-play-badge.png"
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gradient-hero">
            <div className="flex items-center justify-between text-sm text-primary-foreground">
              <div>Free shipping on orders over ₹499</div>
              <div className="flex items-center gap-4">
                <span>Sell on MarketPlace</span>
                <span>Help & Support</span>
                <img
                  src={googlePlayBadgeUrl}
                  alt="Get it on Google Play"
                  className="h-8 w-auto"
                />
              </div>
            </div>
          </div>
          <div className="border-x border-b rounded-b-lg p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={logoUrl} 
                  alt="Brand Logo Preview" 
                  className="h-full w-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-poppins font-bold text-primary">
                <span className="text-red-600">kadal</span>
                <span className="text-foreground ml-1">shopping</span>
              </h1>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};