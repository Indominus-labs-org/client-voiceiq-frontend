"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { AudioUploader } from "@/components/audio-uploader";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { BASE_URL } from "@/lib/constants";

export default function UploadPage() {
  const { toast } = useToast();
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle file addition from AudioUploader
  const handleUploadStart = () => {
    // This is now handled internally by the AudioUploader component
  };

  // Receive files from AudioUploader when they're ready for processing
  const handleUploadComplete = (file: File) => {
    setFileQueue((prev) => [...prev, file]);
    toast({
      title: "File ready for processing",
      description: `"${file.name}" has been added to the processing queue.`,
    });
  };

  // Process the queue - this is called whenever the queue changes or an upload completes
  const processQueue = useCallback(async () => {
    if (fileQueue.length > 0 && !isUploading) {
      const nextFile = fileQueue[0];
      setCurrentFile(nextFile);
      setFileQueue((prev) => prev.slice(1));
      await uploadFileToServer(nextFile);
    }
  }, [fileQueue, isUploading]);

  // Monitor queue and process next file when available
  useEffect(() => {
    processQueue();
  }, [fileQueue, isUploading, processQueue]);

  // Actual upload to server function
  const uploadFileToServer = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Create an XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // Promise to handle the XHR
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve({ message: "File uploaded successfully" });
            }
          } else {
            reject(new Error(`HTTP ErrorS: ${xhr.status}`));
          }
        };

        xhr.onerror = function () {
          reject(new Error("Network Error"));
        };
      });

      // Set up and send the request
      xhr.open("POST", `${BASE_URL}/create_log`, true);
      xhr.send(formData);

      // Wait for the upload to complete
      const data = await uploadPromise;

      // Handle successful upload
      toast({
        title: "Upload Successful",
        description: `"${file.name}" -  "The audio file has been processed successfully."`,
      });

      setCurrentFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      setIsUploading(false);

      setCurrentFile(null);
      setUploadProgress(0);
    }
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Upload Audio"
        text="Upload audio files for analysis and report generation."
      />
      <div className="grid gap-8">
        <AudioUploader
          onUploadStart={handleUploadStart}
          onUploadComplete={handleUploadComplete}
        />

        {currentFile && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Processing File</h3>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">{currentFile.name}</p>
                <Progress value={uploadProgress} className="h-2 w-full" />
              </div>
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        )}

        {fileQueue.length > 0 && (
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-2">
              Processing Queue ({fileQueue.length} files)
            </h3>
            <div className="text-sm text-muted-foreground">
              Files will be processed automatically in the order they were
              added.
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
