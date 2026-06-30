import React, { useState, useRef } from "react";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, LibraryExercise } from "../constants/exerciseLibrary";
import { Play, Plus, Search, Video, X, Flame } from "lucide-react";

interface ExerciseLibrarySelectorProps {
  onSelect: (name: string, videoUrl: string) => void;
  onAddDirectly?: (name: string, videoUrl: string) => void;
  selectedName?: string;
  selectedVideoUrl?: string;
}

export default function ExerciseLibrarySelector({
  onSelect,
  onAddDirectly,
  selectedName,
  selectedVideoUrl
}: ExerciseLibrarySelectorProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string>("Abs");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoName, setPreviewVideoName] = useState<string>("");

  // Filter exercises based on muscle and search query
  const filteredExercises = EXERCISE_LIBRARY.filter(ex => {
    const matchesMuscle = selectedMuscle ? ex.muscle === selectedMuscle : true;
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
      {/* Search and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <Flame className="h-4 w-4 text-emerald-500 animate-pulse" /> Exercise Video Library
          </h4>
          <p className="text-[10px] text-neutral-400">Select an exercise to populate details or quick-add with one click.</p>
        </div>
        
        <div className="relative w-full sm:w-60">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-neutral-500">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Muscle Group Tabs */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-bold text-neutral-400 uppercase font-mono tracking-wider">Select Muscle Group:</span>
        <div className="flex flex-wrap gap-1">
          {MUSCLE_GROUPS.map(muscle => {
            const count = EXERCISE_LIBRARY.filter(ex => ex.muscle === muscle).length;
            const isSelected = selectedMuscle === muscle;
            return (
              <button
                type="button"
                key={muscle}
                onClick={() => setSelectedMuscle(muscle)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? "bg-emerald-950 text-emerald-400 border-emerald-500/50"
                    : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700"
                }`}
              >
                {muscle}
                <span className={`text-[9px] px-1 rounded-full ${
                  isSelected ? "bg-emerald-800/60 text-emerald-300" : "bg-neutral-850 text-neutral-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercises Grid */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {filteredExercises.map((ex) => {
            const isChosen = selectedVideoUrl === ex.videoUrl;
            return (
              <div
                key={ex.name}
                className={`group flex flex-col justify-between bg-neutral-950 border rounded-lg p-2.5 transition-all ${
                  isChosen
                    ? "border-emerald-500 shadow-lg shadow-emerald-950/20 bg-neutral-900"
                    : "border-neutral-850 hover:border-neutral-700"
                }`}
              >
                {/* Video Container (Hover to play) */}
                <div className="relative w-full h-28 bg-neutral-900 rounded overflow-hidden mb-2 border border-neutral-800 flex items-center justify-center">
                  <video
                    src={ex.videoUrl}
                    preload="metadata"
                    muted
                    playsInline
                    loop
                    onMouseEnter={(e) => {
                      e.currentTarget.play().catch(() => {});
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Floating badge for muscle */}
                  <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-neutral-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded">
                    {ex.muscle}
                  </span>

                  {/* Play preview button Overlay */}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewVideoUrl(ex.videoUrl);
                      setPreviewVideoName(ex.name);
                    }}
                    className="absolute inset-0 m-auto h-8 w-8 bg-black/60 hover:bg-emerald-600/90 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all scale-95 opacity-80 group-hover:opacity-100 group-hover:scale-100 cursor-pointer shadow-md"
                    title="Preview Full Video"
                  >
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  </button>

                  <span className="absolute bottom-1 right-1 text-[8px] text-white/50 bg-black/60 px-1 rounded pointer-events-none">
                    hover to play
                  </span>
                </div>

                {/* Info and buttons */}
                <div className="space-y-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{ex.name}</p>
                    <p className="text-[9px] text-neutral-400 font-mono flex items-center gap-1 mt-0.5">
                      <Video className="h-2.5 w-2.5 text-neutral-500" /> Web Demo Link
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelect(ex.name, ex.videoUrl)}
                      className={`py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        isChosen
                          ? "bg-emerald-950 text-emerald-400 border-emerald-500"
                          : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850 hover:text-white"
                      }`}
                    >
                      {isChosen ? "Selected" : "Select Info"}
                    </button>
                    {onAddDirectly && (
                      <button
                        type="button"
                        onClick={() => onAddDirectly(ex.name, ex.videoUrl)}
                        className="py-1 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                        title="Quick add to workout plan using current sets/reps"
                      >
                        <Plus className="h-2.5 w-2.5 stroke-[3px]" /> Quick Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-neutral-950 border border-neutral-850 rounded-lg">
          <p className="text-xs text-neutral-500 italic">No exercises found for "{searchQuery}" under {selectedMuscle}.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedMuscle("Abs");
            }}
            className="text-[10px] text-emerald-400 hover:underline mt-2 cursor-pointer font-bold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-200">
            <div className="px-5 py-3 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white font-mono flex items-center gap-1.5 uppercase">
                <Video className="text-emerald-400 h-4 w-4" /> Demo: {previewVideoName}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPreviewVideoUrl(null);
                  setPreviewVideoName("");
                }}
                className="text-neutral-400 hover:text-white bg-neutral-800 p-1 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelect(previewVideoName, previewVideoUrl);
                  setPreviewVideoUrl(null);
                }}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 rounded text-xs font-bold border border-neutral-800 transition-colors cursor-pointer"
              >
                Select & Close
              </button>
              {onAddDirectly && (
                <button
                  type="button"
                  onClick={() => {
                    onAddDirectly(previewVideoName, previewVideoUrl);
                    setPreviewVideoUrl(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Quick Add to Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
