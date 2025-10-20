"use client";

import { useComponentState } from "../app/providers";

export function LivePreview() {
  const { componentState } = useComponentState();

  return (
    <div className="flex-1 flex flex-col border-b border-border">
      <div className="p-4 border-b border-border bg-background">
        <h2 className="text-lg font-semibold">Live Preview</h2>
        <p className="text-sm text-muted-foreground">
          See your component as it&apos;s generated
        </p>
      </div>

      <div className="flex-1 p-4 bg-muted/20 overflow-auto">
        {componentState.componentCode ? (
          <iframe
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    body { margin: 0; padding: 0; }
                  </style>
                </head>
                <body>
                  ${componentState.componentCode}
                </body>
              </html>
            `}
            className="w-full h-full border border-border rounded-lg bg-white"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Preview will appear here...</p>
          </div>
        )}
      </div>
    </div>
  );
}
