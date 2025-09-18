"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function UploadResumesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 10) {
      toast.error("Please select maximum 10 files");
      return;
    }
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!files || files.length === 0) {
      toast.error("Please select at least one resume file");
      return;
    }

    if (!jobDescription.trim()) {
      toast.error("Please provide a job description");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      // Add files
      Array.from(files).forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      
      // Add job description
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/resume/process", {
        method: "POST",
        body: formData,
      });

      // Check if response is ok and content type is JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        toast.error(`Server error: ${response.status} - ${response.statusText}`);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("Non-JSON Response:", errorText);
        toast.error("Server returned invalid response format");
        return;
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        // Store data in localStorage for demo mode
        if (result.runData) {
          console.log('Storing runData:', result.runData);
          const runDataWithId = {
            ...result.runData,
            id: result.runId
          };
          const existingRuns = JSON.parse(localStorage.getItem('recruitRuns') || '[]');
          existingRuns.unshift(runDataWithId);
          localStorage.setItem('recruitRuns', JSON.stringify(existingRuns));
          console.log('Stored runs:', existingRuns);
        }
        
        if (result.candidates) {
          console.log('Storing candidates:', result.candidates);
          const existingCandidates = JSON.parse(localStorage.getItem('recruitCandidates') || '[]');
          existingCandidates.push(...result.candidates);
          localStorage.setItem('recruitCandidates', JSON.stringify(existingCandidates));
          console.log('Stored candidates:', existingCandidates);
        }
        
        toast.success(`Successfully processed ${files.length} resumes. Run ID: ${result.runId}`);
        router.push("/recruit/dashboard");
      } else {
        toast.error(result.error || "Failed to process resumes");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resumes. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Upload Resumes for AI Analysis
        </h1>
        <p className="text-lg">
          Upload up to 10 resume files and provide a job description for AI-powered candidate screening
        </p>
      </div>

      <div className="card-border w-[70%] mx-auto">
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="form space-y-6">
            {/* Job Description */}
            <div className="space-y-2">
              <Label htmlFor="jobDescription" className="label">
                Job Description *
              </Label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter the job description, requirements, and qualifications..."
                className="w-full px-5 py-3 min-h-32 resize-none bg-dark-200 rounded-md text-light-100 placeholder:text-light-100 border border-input focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-200"
                rows={6}
                required
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="resumes" className="label">
                Resume Files (PDF, DOC, DOCX) - Max 10 files *
              </Label>
              <div className="relative bg-dark-200 rounded-full min-h-20 w-full max-w-2xl mx-auto px-8 cursor-pointer border border-input overflow-hidden">
                <Input
                  id="resumes"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full h-full opacity-0 cursor-pointer absolute inset-0"
                  required
                />
                <div className="flex items-center justify-center gap-3 h-full min-h-20">
                  <Image src="/upload.svg" alt="Upload" width={24} height={24} />
                  <span className="text-light-100 text-lg">Choose files or drag and drop</span>
                </div>
              </div>
              {files && (
                <p className="text-sm text-light-100">
                  Selected {files.length} file(s)
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={isUploading || !files || files.length === 0 || !jobDescription.trim()}
                className="btn"
              >
                {isUploading ? "Processing..." : "Process Resumes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
