"use client";

import * as React from "react";

export const Toast = React.forwardRef(({ title, description }, ref) => (
  <div ref={ref} className="p-4 mb-2 rounded-md shadow-md bg-gray-800 text-white">
    {title && <div className="font-bold">{title}</div>}
    {description && <div className="text-sm">{description}</div>}
  </div>
));

export const ToastViewport = ({ children }) => (
  <div className="fixed bottom-4 right-4 flex flex-col items-end z-50">
    {children}
  </div>
);
