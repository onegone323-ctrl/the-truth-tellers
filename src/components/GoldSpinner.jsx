import React from "react";

// The app's loading spinner: a thin ring of gold.
export default function GoldSpinner() {
  return (
    <div className="flex justify-center pt-16">
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }}
      />
    </div>
  );
}