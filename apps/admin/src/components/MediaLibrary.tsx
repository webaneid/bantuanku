"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  XMarkIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  alt?: string;
  description?: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  selectedUrl?: string;
  accept?: string; // e.g., "image/*", "video/*"
  category?: "general" | "financial" | "activity" | "document"; // Filter by category
  showUploadToast?: boolean;
  onUploadResult?: (result: { success: boolean; message: string; url?: string }) => void;
}

export default function MediaLibrary({
  isOpen,
  onClose,
  onSelect,
  selectedUrl,
  accept = "image/*",
  category,
  showUploadToast = true,
  onUploadResult,
}: MediaLibraryProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload" | "camera">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [tempSelectedUrl, setTempSelectedUrl] = useState(selectedUrl || "");

  // Detect if mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Fetch media library
  const { data: mediaItems, isLoading } = useQuery({
    queryKey: ["media-library", searchQuery, category],
    queryFn: async () => {
      const response = await api.get("/admin/media", {
        params: {
          search: searchQuery,
          category: category || undefined, // Filter by category if provided
        },
      });
      return response.data.data as MediaItem[];
    },
    enabled: isOpen,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      // Set category if provided (for financial documents, activity photos, etc.)
      if (category) {
        formData.append("category", category);
      }
      return api.post("/admin/media/upload", formData);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      const uploadedUrl = response.data?.data?.url || "";
      if (showUploadToast) {
        toast.success("File berhasil diupload!");
      }
      onUploadResult?.({
        success: true,
        message: "File berhasil diupload!",
        url: uploadedUrl,
      });
      setTempSelectedUrl(uploadedUrl);
      setActiveTab("library");
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Gagal upload file";
      if (showUploadToast) {
        toast.error(errorMessage);
      }
      onUploadResult?.({
        success: false,
        message: errorMessage,
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleMediaClick = (media: MediaItem) => {
    setSelectedMedia(media);
    setTempSelectedUrl(media.url);
  };

  const handleInsert = () => {
    if (tempSelectedUrl) {
      onSelect(tempSelectedUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="media-library-backdrop">
      <div className="media-library-modal">
        {/* Header */}
        <div className="media-library-header">
          <h2 className="media-library-title">Gambar andalan</h2>
          <button type="button" className="media-library-close" onClick={onClose}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="media-library-tabs">
          <button
            type="button"
            className={`media-library-tab ${activeTab === "library" ? "active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            <PhotoIcon className="w-5 h-5" />
            Pustaka Media
          </button>
          <button
            type="button"
            className={`media-library-tab ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Unggah berkas
          </button>
          {isMobile && (
            <button
              type="button"
              className={`media-library-tab ${activeTab === "camera" ? "active" : ""}`}
              onClick={() => setActiveTab("camera")}
            >
              <CameraIcon className="w-5 h-5" />
              Ambil Foto
            </button>
          )}
        </div>

        {/* Content */}
        <div className="media-library-content">
          <div className="media-library-main">
            {activeTab === "library" && (
              <>
                {/* Search */}
                <div className="media-library-search">
                  <MagnifyingGlassIcon />
                  <input
                    type="text"
                    placeholder="Cari media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Media Grid */}
                <div className="media-library-grid">
                  {isLoading ? (
                    <div className="media-library-loading">Loading...</div>
                  ) : mediaItems && mediaItems.length > 0 ? (
                    mediaItems.map((media) => (
                      <div
                        key={media.id}
                        className={`media-library-item ${
                          tempSelectedUrl === media.url ? "selected" : ""
                        }`}
                        onClick={() => handleMediaClick(media)}
                      >
                        <img src={media.url} alt={media.alt || media.filename} />
                        {tempSelectedUrl === media.url && (
                          <div className="media-library-item-check">
                            <CheckIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="media-library-empty">Tidak ada media</div>
                  )}
                </div>
              </>
            )}

            {activeTab === "upload" && (
              <div className="media-library-upload">
              <div
                className="media-library-dropzone"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="w-12 h-12 text-gray-400" />
                <p className="text-lg font-medium text-gray-700">
                  Seret & Lepas file di sini
                </p>
                <p className="text-sm text-gray-500">atau klik untuk memilih file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </div>

              {uploadMutation.isPending && (
                <div className="media-library-uploading">
                  <div className="spinner"></div>
                  <p>Uploading...</p>
                </div>
              )}
              </div>
            )}

            {activeTab === "camera" && isMobile && (
              <div className="media-library-camera">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="media-library-camera-input"
                />
              </div>
            )}
          </div>

          {/* Sidebar - Detail Media */}
          {selectedMedia && activeTab === "library" && (
            <div className="media-library-sidebar">
            <div className="media-library-detail">
              <div className="media-library-detail-preview">
                <img src={selectedMedia.url} alt={selectedMedia.alt || selectedMedia.filename} />
              </div>

              <div className="media-library-detail-info">
                <div className="form-field">
                  <label className="form-label">Judul</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={selectedMedia.title}
                    placeholder="Judul gambar"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Teks Alt</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={selectedMedia.alt}
                    placeholder="Teks alternatif untuk SEO"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    defaultValue={selectedMedia.description}
                    placeholder="Deskripsi gambar"
                  />
                </div>

                <div className="media-library-detail-meta">
                  <div>
                    <strong>File:</strong> {selectedMedia.filename}
                  </div>
                  <div>
                    <strong>Size:</strong> {(selectedMedia.size / 1024).toFixed(2)} KB
                  </div>
                  <div>
                    <strong>URL:</strong>
                    <input
                      type="text"
                      className="form-input mt-1"
                      value={selectedMedia.url}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="media-library-footer">
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={handleInsert}
            disabled={!tempSelectedUrl}
          >
            Tetapkan gambar unggulan
          </button>
        </div>
      </div>
    </div>
  );
}
