"use client";

import { useState, useRef } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Loader2, Upload } from "lucide-react";

interface ScreenshotUploaderProps {
  onUploadComplete: (url: string) => void;
}

export default function ScreenshotUploader({
  onUploadComplete,
}: ScreenshotUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get a URL for uploading
      const uploadUrl = await generateUploadUrl();

      // Prepare to track upload progress
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Set up promise to handle upload completion
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              // Extract the storageId from the response
              const response = JSON.parse(xhr.responseText);
              resolve(response.storageId);
            } else {
              reject(new Error("Upload failed"));
            }
          }
        };
      });

      // Start upload
      xhr.open("POST", uploadUrl, true);
      xhr.send(file);

      // Wait for upload to complete
      const storageId = await uploadPromise;

      // Get the URL for the uploaded file using Convex's storage.getUrl
      // We need to call the query directly since we need the result immediately after upload
      const fileUrl = await convex.query(api.files.getUrl, { storageId });

      // Send the URL back to the parent component
      if (fileUrl) onUploadComplete(fileUrl);

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept="image/*"
      />

      <div
        onClick={triggerFileInput}
        className="border-2 border-dashed border-input rounded-lg p-6 cursor-pointer hover:border-primary transition-colors"
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="w-full h-auto max-h-64 object-contain rounded-md"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">{uploadProgress}%</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">
              Drop your LeetCode screenshot here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG or GIF (max 5MB)
            </p>
          </div>
        )}
      </div>

      {previewUrl && !isUploading && (
        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={triggerFileInput}
        >
          Change image
        </Button>
      )}
    </div>
  );
}
