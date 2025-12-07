import React, { useState } from "react";
import { Sparkles, Loader2, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";

export function AiVisualsPanel() {
  const { addOverlay, getAspectRatioDimensions } = useEditorContext();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("aspect_ratio", aspectRatio);

      const response = await fetch("http://localhost:8000/ai-visuals/generate-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success && data.image_url) {
        setGeneratedImages((prev) => [data.image_url, ...prev]);
      } else {
        const errorMessage = data.detail || data.message || "Unknown error";
        console.error("Generation failed:", errorMessage);
        alert(`Failed to generate image: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert(`Error generating image: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddImage = (url: string) => {
    const { width, height } = getAspectRatioDimensions();
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Calculate aspect ratio aware dimensions
      let imgWidth = width * 0.5; // Default to 50% of canvas width
      let imgHeight = (imgWidth / img.naturalWidth) * img.naturalHeight;
      
      addOverlay({
        id: Date.now(),
        type: OverlayType.IMAGE,
        src: url,
        content: "AI Generated Image",
        styles: {
          opacity: 1,
          zIndex: 10,
          objectFit: "cover",
          borderRadius: "0px",
        },
        left: (width - imgWidth) / 2,
        top: (height - imgHeight) / 2,
        width: imgWidth,
        height: imgHeight,
        durationInFrames: 150, // 5 seconds
        from: 0,
        row: 1,
        isDragging: false,
        rotation: 0,
      });
    };
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Magic Assets
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate unique images for your video using AI.
        </p>
      </div>

      <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Input
            id="prompt"
            placeholder="E.g. A futuristic serum bottle on a marble table..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-white dark:bg-slate-950"
          />
        </div>

        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger className="bg-white dark:bg-slate-950">
              <SelectValue placeholder="Select ratio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
              <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={!prompt || isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Magic...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Label className="mb-2 block">Generated Gallery</Label>
        {generatedImages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>No images yet. <br/>Try generating something!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {generatedImages.map((url, index) => (
              <div key={index} className="group relative aspect-video rounded-lg overflow-hidden border bg-slate-100">
                <img 
                  src={url} 
                  alt={`Generated ${index}`} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    size="icon" 
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleAddImage(url)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="h-8 w-8 rounded-full bg-white/90 text-black flex items-center justify-center hover:bg-white"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

