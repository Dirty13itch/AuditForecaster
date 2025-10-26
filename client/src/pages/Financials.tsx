import { useEffect } from "react";
import { useLocation } from "wouter";

// This page redirects to the Financial Dashboard
export default function Financials() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to the Financial Dashboard
    setLocation("/financial-dashboard");
  }, [setLocation]);

  return null;
}