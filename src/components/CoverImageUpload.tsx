import { useState, useEffect, useCallback } from 'react';
import { ImagePlus, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface CoverImageUploadProps {
  coverImagePath: string | null;
  onPathChange: (path: string | null) => void;
  postIdentifier: string;
}

export default function CoverImageUpload({
  coverImagePath,
  onPathChange,
  postIdentifier,
}: CoverImageUploadProps) {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from('post-covers')
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(data.signedUrl);
  }, []);

  useEffect(() => {
    if (coverImagePath) {
      loadPreview(coverImagePath);
    } else {
      setPreviewUrl(null);
    }
  }, [coverImagePath, loadPreview]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please select an image file (JPEG, PNG, WebP, or GIF).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be smaller than 5MB.';
    }
    return null;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${postIdentifier}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Remove old cover if it's different
    if (coverImagePath && coverImagePath !== filePath) {
      await supabase.storage.from('post-covers').remove([coverImagePath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('post-covers')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    onPathChange(filePath);
    setUploading(false);
  };

  const handleRemove = async () => {
    if (coverImagePath) {
      await supabase.storage.from('post-covers').remove([coverImagePath]);
    }
    onPathChange(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative group rounded-lg overflow-hidden border bg-muted/20">
          <img
            src={previewUrl}
            alt="Cover preview"
            className="w-full h-48 object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleRemove}
            className="absolute top-2 right-2 h-8 w-8 opacity-90 shadow-md"
            title="Remove cover image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor="cover-upload"
          className={cn(
            'flex flex-col items-center justify-center gap-2 cursor-pointer',
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            'hover:border-foreground/30 hover:bg-muted/30',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : 'Add cover image'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, WebP, or GIF up to 5MB
            </p>
          </div>
          <input
            id="cover-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
