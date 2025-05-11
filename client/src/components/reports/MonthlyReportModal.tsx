import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Download, FileBarChart, FileText, PieChart as PieChartIcon } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { formatCurrency, formatShortCurrency, getCategoryColor } from "@/lib/expenseUtils";
import { useToast } from "@/hooks/use-toast";

// Define types for the monthly report data
interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface StatusBreakdown {
  status: string;
  amount: number;
  percentage: number;
}

interface CompletedGoal {
  name: string;
  targetAmount: number;
  completedDate: string;
}

interface Achievement {
  name: string;
  type: string;
  date: string;
  coinsAwarded: number;
}

interface MonthlyReportData {
  monthName: string;
  year: number;
  expenses: {
    total: number;
    count: number;
    change: number;
    byCategory: CategoryBreakdown[];
    byStatus: StatusBreakdown[];
  };
  savings: {
    total: number;
    count: number;
    savingsRate: number;
  };
  goals: {
    active: number;
    completed: number;
    completedDetails: CompletedGoal[];
  };
  achievements: {
    count: number;
    details: Achievement[];
  };
  insights: string[];
}

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", 
  "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57"
];

const MonthlyReportModal = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth().toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // Generate month options
  const monthOptions = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];

  // Generate year options (current year and 2 previous years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: currentYear.toString(), label: currentYear.toString() },
    { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
    { value: (currentYear - 2).toString(), label: (currentYear - 2).toString() }
  ];

  // Fetch report data with real-time updates
  const { data: reportData, isLoading, refetch } = useQuery<MonthlyReportData>({
    queryKey: [`/api/monthly-report?month=${month}&year=${year}`],
    enabled: open, // Only fetch when modal is open
    refetchInterval: 5000, // Poll every 5 seconds for updates when modal is open
    refetchOnWindowFocus: true, // Refetch when window gets focus
    staleTime: 0, // Consider data immediately stale for real-time updates
  });

  // Handle date change
  const handleDateChange = () => {
    refetch();
  };

  // Download report as PDF with real-time data
  const downloadReport = async () => {
    if (!reportData) return;

    try {
      // Before generating PDF, fetch the latest data to ensure most current information
      await refetch();
      
      // Helper function to add a consistent styled header to PDF pages
      const addPageHeader = (pdf: jsPDF, pageWidth: number, margin: number, isFirstPage: boolean = false) => {
        // Main header background
        pdf.setFillColor(66, 135, 245); // Primary blue color
        pdf.rect(0, 0, pageWidth, isFirstPage ? 80 : 40, 'F');
        pdf.setFillColor(97, 174, 255); // Lighter blue
        pdf.rect(0, isFirstPage ? 80 : 40, pageWidth, isFirstPage ? 10 : 5, 'F');
        
        // Logo size and position based on page type
        const logoRadius = isFirstPage ? 12 : 8;
        const logoX = margin + logoRadius;
        const logoY = isFirstPage ? 40 : 20;
        const textOffset = isFirstPage ? 30 : 20;
        
        // Add logo
        pdf.setFillColor(255, 255, 255);
        pdf.circle(logoX, logoY, logoRadius, 'F');
        pdf.setFillColor(66, 135, 245);
        pdf.setTextColor(26, 95, 205);
        pdf.setFontSize(isFirstPage ? 18 : 12);
        pdf.setFont("helvetica", "bold");
        pdf.text("W", logoX - (isFirstPage ? 7 : 4), logoY + (isFirstPage ? 5 : 3));
        
        // Add title text
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(isFirstPage ? 24 : 16);
        pdf.setFont("helvetica", "bold");
        
        const titleText = isFirstPage 
          ? `WealthWise Monthly Report` 
          : `WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`;
        
        pdf.text(titleText, margin + textOffset, isFirstPage ? 40 : 25);
        
        // Add subtitle on first page
        if (isFirstPage) {
          pdf.setFontSize(18);
          pdf.setFont("helvetica", "normal");
          pdf.text(`${reportData.monthName} ${reportData.year}`, margin + textOffset, 65);
        }
      };
      
      // Show download in progress
      const downloadButtonSpan = document.querySelector(".download-button span");
      const originalButtonText = downloadButtonSpan?.textContent || "Download Report";
      if (downloadButtonSpan) {
        downloadButtonSpan.textContent = "Generating PDF...";
      }
      
      // Create PDF with enhanced visuals
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);
      
      // Add enhanced first page header
      addPageHeader(pdf, pageWidth, margin, true);
      
      // Add timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(10);
      pdf.setTextColor(220, 220, 220);
      pdf.text(`Generated on: ${timestamp}`, pageWidth - margin - 150, 65);
      
      // Start content after header
      let yOffset = 120;
      
      // Add summary section with colored background
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(margin, yOffset, contentWidth, 100, 5, 5, 'F');
      
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(16);
      pdf.text("Expense Summary", margin + 20, yOffset + 30);
      
      // Add colorful expense total
      pdf.setFontSize(22);
      pdf.setTextColor(66, 135, 245);
      pdf.text(`${formatCurrency(reportData.expenses.total)}`, margin + 20, yOffset + 60);
      
      // Add change indicator with appropriate color
      const changeColor: [number, number, number] = reportData.expenses.change <= 0 
        ? [46, 204, 113] // Green
        : [231, 76, 60]; // Red
      pdf.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
      pdf.setFontSize(14);
      const changeText = `${reportData.expenses.change > 0 ? "+" : ""}${reportData.expenses.change}% vs prev month`;
      pdf.text(changeText, margin + 20, yOffset + 85);
      
      yOffset += 120;
      
      // Add categories section with a colorful pie chart simulation
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(margin, yOffset, contentWidth, 30 + (reportData.expenses.byCategory.length * 30), 5, 5, 'F');
      
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(16);
      pdf.text("Expense Categories", margin + 20, yOffset + 25);
      
      yOffset += 40;
      
      // Add colored category bars
      const categoryColors: Array<[number, number, number]> = [
        [66, 135, 245],  // Blue
        [46, 204, 113],  // Green
        [155, 89, 182],  // Purple
        [231, 76, 60],   // Red
        [241, 196, 15],  // Yellow
        [52, 152, 219],  // Light Blue
        [230, 126, 34],  // Orange
        [149, 165, 166], // Gray
        [41, 128, 185],  // Dark Blue
        [39, 174, 96]    // Dark Green
      ];
      
      reportData.expenses.byCategory.forEach((cat, index) => {
        const barY = yOffset + (index * 30);
        const color = categoryColors[index % categoryColors.length];
        
        // Category color indicator
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(margin + 20, barY, 15, 15, 2, 2, 'F');
        
        // Category text
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(12);
        pdf.text(`${cat.category}`, margin + 45, barY + 12);
        
        // Category amount and percentage
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(`${formatCurrency(cat.amount)} (${cat.percentage}%)`, margin + 180, barY + 12);
        
        // Progress bar background
        pdf.setFillColor(220, 220, 220);
        pdf.roundedRect(margin + 300, barY, 200, 15, 2, 2, 'F');
        
        // Progress bar fill based on percentage
        pdf.setFillColor(color[0], color[1], color[2]);
        const fillWidth = Math.min(200, (cat.percentage / 100) * 200);
        pdf.roundedRect(margin + 300, barY, fillWidth, 15, 2, 2, 'F');
      });
      
      yOffset += (reportData.expenses.byCategory.length * 30) + 30;
      
      // Check if we need a new page for status breakdown
      if (yOffset > pageHeight - 150) {
        pdf.addPage();
        
        // Add header to new page
        pdf.setFillColor(66, 135, 245);
        pdf.rect(0, 0, pageWidth, 40, 'F');
        pdf.setFillColor(97, 174, 255);
        pdf.rect(0, 40, pageWidth, 5, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.text(`WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`, margin, 25);
        
        yOffset = 80;
      }
      
      // Add spending status section
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(margin, yOffset, contentWidth, 30 + (reportData.expenses.byStatus.length * 30), 5, 5, 'F');
      
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(16);
      pdf.text("Spending Status", margin + 20, yOffset + 25);
      
      yOffset += 40;
      
      // Status colors mapping
      const statusColors: Record<string, [number, number, number]> = {
        "necessary": [52, 152, 219],    // Blue
        "avoidable": [241, 196, 15],    // Yellow
        "unnecessary": [231, 76, 60]    // Red
      };
      
      // Default gray color for unknown status
      const defaultColor: [number, number, number] = [149, 165, 166];
      
      // Add colored status bars
      reportData.expenses.byStatus.forEach((status, index) => {
        const barY = yOffset + (index * 30);
        const color = statusColors[status.status] || defaultColor;
        
        // Status color indicator
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(margin + 20, barY, 15, 15, 2, 2, 'F');
        
        // Status text
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(12);
        const statusLabel = status.status.charAt(0).toUpperCase() + status.status.slice(1);
        pdf.text(`${statusLabel}`, margin + 45, barY + 12);
        
        // Status amount and percentage
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(`${formatCurrency(status.amount)} (${status.percentage}%)`, margin + 180, barY + 12);
        
        // Progress bar background
        pdf.setFillColor(220, 220, 220);
        pdf.roundedRect(margin + 300, barY, 200, 15, 2, 2, 'F');
        
        // Progress bar fill based on percentage
        pdf.setFillColor(color[0], color[1], color[2]);
        const fillWidth = Math.min(200, (status.percentage / 100) * 200);
        pdf.roundedRect(margin + 300, barY, fillWidth, 15, 2, 2, 'F');
      });
      
      yOffset += (reportData.expenses.byStatus.length * 30) + 30;
      
      // Check if we need a new page for insights
      if (yOffset > pageHeight - 180 && reportData.insights.length > 0) {
        pdf.addPage();
        
        // Add header to new page
        pdf.setFillColor(66, 135, 245);
        pdf.rect(0, 0, pageWidth, 40, 'F');
        pdf.setFillColor(97, 174, 255);
        pdf.rect(0, 40, pageWidth, 5, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.text(`WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`, margin, 25);
        
        yOffset = 80;
      }
      
      // Add insights section if we have any
      if (reportData.insights.length > 0) {
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(margin, yOffset, contentWidth, 30 + (reportData.insights.length * 25), 5, 5, 'F');
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(16);
        pdf.text("Insights & Recommendations", margin + 20, yOffset + 25);
        
        yOffset += 40;
        
        // Add each insight with a bullet point
        reportData.insights.forEach((insight, index) => {
          // Bullet point
          pdf.setFillColor(66, 135, 245);
          pdf.circle(margin + 10, yOffset + 6, 3, 'F');
          
          // Insight text with wrapping
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(11);
          
          // Handle text wrapping manually for long insights
          const maxWidth = contentWidth - 30;
          const lines = pdf.splitTextToSize(insight, maxWidth);
          
          lines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, margin + 20, yOffset + (lineIndex * 15));
            
            // If we're going to overflow, add a new page
            if (yOffset + ((lineIndex + 1) * 15) > pageHeight - margin) {
              pdf.addPage();
              
              // Add header to new page
              pdf.setFillColor(66, 135, 245);
              pdf.rect(0, 0, pageWidth, 40, 'F');
              pdf.setFillColor(97, 174, 255);
              pdf.rect(0, 40, pageWidth, 5, 'F');
              
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(16);
              pdf.text(`WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`, margin, 25);
              
              yOffset = margin;
            }
          });
          
          // Update yOffset based on number of lines
          yOffset += lines.length * 15 + 10;
        });
      }
      
      // Add footer with page numbers to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Add a gradient footer
        pdf.setFillColor(97, 174, 255); // Lighter blue
        pdf.rect(0, pageHeight - 30, pageWidth, 5, 'F');
        pdf.setFillColor(66, 135, 245); // Primary blue
        pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
        
        // Page number
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.text(`WealthWise Financial Report - Page ${i} of ${totalPages}`, margin, pageHeight - 10);
        
        // Company logo text
        pdf.setFontSize(10);
        pdf.text("WealthWise", pageWidth - margin - 60, pageHeight - 10);
      }
      
      // Save the PDF
      pdf.save(`WealthWise_Report_${reportData.monthName}_${reportData.year}.pdf`);
      
      // Success toast
      toast({
        title: "Report generated successfully",
        description: "Your colorful PDF report has been downloaded.",
        duration: 3000,
      });
      
      // Reset button text
      const buttonSpan = document.querySelector(".download-button span");
      if (buttonSpan) {
        buttonSpan.textContent = originalButtonText;
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      
      // Show error to user
      const buttonSpan = document.querySelector(".download-button span");
      if (buttonSpan) {
        buttonSpan.textContent = "Error - Retrying...";
      }
      
      // Try a more visually appealing PDF approach
      try {
        toast({
          title: "Attempting enhanced PDF generation",
          description: "Creating a colorful PDF report...",
          duration: 3000,
        });
        
        // Create PDF with enhanced visuals
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4"
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);
        
        // Add a gradient header with enhanced styling
        pdf.setFillColor(66, 135, 245); // Primary blue color
        pdf.rect(0, 0, pageWidth, 80, 'F');
        pdf.setFillColor(97, 174, 255); // Lighter blue
        pdf.rect(0, 80, pageWidth, 10, 'F');
        
        // Add company logo - simplified WW icon
        pdf.setFillColor(255, 255, 255);
        pdf.circle(margin + 12, 40, 12, 'F');
        pdf.setFillColor(66, 135, 245);
        pdf.setTextColor(26, 95, 205);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text("W", margin + 5, 45);
        
        // Add title with white text on blue background
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");
        pdf.text(`WealthWise Monthly Report`, margin + 30, 40);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${reportData.monthName} ${reportData.year}`, margin + 30, 65);
        
        // Add timestamp
        const timestamp = new Date().toLocaleString();
        pdf.setFontSize(10);
        pdf.setTextColor(220, 220, 220);
        pdf.text(`Generated on: ${timestamp}`, pageWidth - margin - 150, 65);
        
        // Start content after header
        let yOffset = 120;
        
        // Add summary section with colored background
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(margin, yOffset, contentWidth, 100, 5, 5, 'F');
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(16);
        pdf.text("Expense Summary", margin + 20, yOffset + 30);
        
        // Add colorful expense total
        pdf.setFontSize(22);
        pdf.setTextColor(66, 135, 245);
        pdf.text(`${formatCurrency(reportData.expenses.total)}`, margin + 20, yOffset + 60);
        
        // Add change indicator with appropriate color
        const changeColor: [number, number, number] = reportData.expenses.change <= 0 ? [46, 204, 113] : [231, 76, 60];
        pdf.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
        pdf.setFontSize(14);
        const changeText = `${reportData.expenses.change > 0 ? "+" : ""}${reportData.expenses.change}% vs prev month`;
        pdf.text(changeText, margin + 20, yOffset + 85);
        
        yOffset += 120;
        
        // Add categories section with a colorful pie chart simulation
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(margin, yOffset, contentWidth, 30 + (reportData.expenses.byCategory.length * 30), 5, 5, 'F');
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(16);
        pdf.text("Expense Categories", margin + 20, yOffset + 25);
        
        yOffset += 40;
        
        // Add colored category bars
        const categoryColors: Array<[number, number, number]> = [
          [66, 135, 245],  // Blue
          [46, 204, 113],  // Green
          [155, 89, 182],  // Purple
          [231, 76, 60],   // Red
          [241, 196, 15],  // Yellow
          [52, 152, 219],  // Light Blue
          [230, 126, 34],  // Orange
          [149, 165, 166], // Gray
          [41, 128, 185],  // Dark Blue
          [39, 174, 96]    // Dark Green
        ];
        
        reportData.expenses.byCategory.forEach((cat, index) => {
          const barY = yOffset + (index * 30);
          const color = categoryColors[index % categoryColors.length];
          
          // Category color indicator
          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.roundedRect(margin + 20, barY, 15, 15, 2, 2, 'F');
          
          // Category text
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(12);
          pdf.text(`${cat.category}`, margin + 45, barY + 12);
          
          // Category amount and percentage
          pdf.setTextColor(color[0], color[1], color[2]);
          pdf.text(`${formatCurrency(cat.amount)} (${cat.percentage}%)`, margin + 180, barY + 12);
          
          // Progress bar background
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(margin + 300, barY, 200, 15, 2, 2, 'F');
          
          // Progress bar fill based on percentage
          pdf.setFillColor(color[0], color[1], color[2]);
          const fillWidth = Math.min(200, (cat.percentage / 100) * 200);
          pdf.roundedRect(margin + 300, barY, fillWidth, 15, 2, 2, 'F');
        });
        
        yOffset += (reportData.expenses.byCategory.length * 30) + 30;
        
        // Check if we need a new page for status breakdown
        if (yOffset > pageHeight - 150) {
          pdf.addPage();
          
          // Add header to new page
          pdf.setFillColor(66, 135, 245);
          pdf.rect(0, 0, pageWidth, 40, 'F');
          pdf.setFillColor(97, 174, 255);
          pdf.rect(0, 40, pageWidth, 5, 'F');
          
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(16);
          pdf.text(`WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`, margin, 25);
          
          yOffset = 80;
        }
        
        // Add spending status section
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(margin, yOffset, contentWidth, 30 + (reportData.expenses.byStatus.length * 30), 5, 5, 'F');
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(16);
        pdf.text("Spending Status", margin + 20, yOffset + 25);
        
        yOffset += 40;
        
        // Status colors mapping with type annotation
        const statusColors: Record<string, [number, number, number]> = {
          "necessary": [52, 152, 219],    // Blue
          "avoidable": [241, 196, 15],    // Yellow
          "unnecessary": [231, 76, 60]    // Red
        };
        
        // Default gray color for unknown status
        const defaultColor: [number, number, number] = [149, 165, 166];
        
        // Add colored status bars
        reportData.expenses.byStatus.forEach((status, index) => {
          const barY = yOffset + (index * 30);
          const color = statusColors[status.status] || defaultColor;
          
          // Status color indicator
          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.roundedRect(margin + 20, barY, 15, 15, 2, 2, 'F');
          
          // Status text
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(12);
          const statusLabel = status.status.charAt(0).toUpperCase() + status.status.slice(1);
          pdf.text(`${statusLabel}`, margin + 45, barY + 12);
          
          // Status amount and percentage
          pdf.setTextColor(color[0], color[1], color[2]);
          pdf.text(`${formatCurrency(status.amount)} (${status.percentage}%)`, margin + 180, barY + 12);
          
          // Progress bar background
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(margin + 300, barY, 200, 15, 2, 2, 'F');
          
          // Progress bar fill based on percentage
          pdf.setFillColor(color[0], color[1], color[2]);
          const fillWidth = Math.min(200, (status.percentage / 100) * 200);
          pdf.roundedRect(margin + 300, barY, fillWidth, 15, 2, 2, 'F');
        });
        
        yOffset += (reportData.expenses.byStatus.length * 30) + 30;
        
        // Check if we need a new page for insights
        if (yOffset > pageHeight - 180 && reportData.insights.length > 0) {
          pdf.addPage();
          
          // Add header to new page
          pdf.setFillColor(66, 135, 245);
          pdf.rect(0, 0, pageWidth, 40, 'F');
          pdf.setFillColor(97, 174, 255);
          pdf.rect(0, 40, pageWidth, 5, 'F');
          
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(16);
          pdf.text(`WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`, margin, 25);
          
          yOffset = 80;
        }
        
        // Add insights section if we have any
        if (reportData.insights.length > 0) {
          pdf.setFillColor(245, 247, 250);
          pdf.roundedRect(margin, yOffset, contentWidth, 30 + (reportData.insights.length * 25), 5, 5, 'F');
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(16);
          pdf.text("Insights & Recommendations", margin + 20, yOffset + 25);
          
          yOffset += 40;
          
          // Add each insight with a bullet point
          reportData.insights.forEach((insight, index) => {
            // Bullet point
            pdf.setFillColor(66, 135, 245);
            pdf.circle(margin + 10, yOffset + 6, 3, 'F');
            
            // Insight text with wrapping
            pdf.setTextColor(60, 60, 60);
            pdf.setFontSize(11);
            
            // Handle text wrapping manually for long insights
            const maxWidth = contentWidth - 30;
            const lines = pdf.splitTextToSize(insight, maxWidth);
            
            lines.forEach((line: string, lineIndex: number) => {
              pdf.text(line, margin + 20, yOffset + (lineIndex * 15));
              
              // If we're going to overflow, add a new page
              if (yOffset + ((lineIndex + 1) * 15) > pageHeight - margin) {
                pdf.addPage();
                
                // Add header to new page
                pdf.setFillColor(66, 135, 245);
                pdf.rect(0, 0, pageWidth, 40, 'F');
                pdf.setFillColor(97, 174, 255);
                pdf.rect(0, 40, pageWidth, 5, 'F');
                
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(16);
                pdf.text(`WealthWise Monthly Report - ${reportData.monthName} ${reportData.year}`, margin, 25);
                
                yOffset = margin;
              }
            });
            
            // Update yOffset based on number of lines
            yOffset += lines.length * 15 + 10;
          });
        }
        
        // Add footer with page numbers to all pages
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // Add a gradient footer
          pdf.setFillColor(97, 174, 255); // Lighter blue
          pdf.rect(0, pageHeight - 30, pageWidth, 5, 'F');
          pdf.setFillColor(66, 135, 245); // Primary blue
          pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
          
          // Page number
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.text(`WealthWise Financial Report - Page ${i} of ${totalPages}`, margin, pageHeight - 10);
          
          // Company logo text
          pdf.setFontSize(10);
          pdf.text("WealthWise", pageWidth - margin - 60, pageHeight - 10);
        }
        
        // Save the PDF
        pdf.save(`WealthWise_Report_${reportData.monthName}_${reportData.year}.pdf`);
        
        // Success toast
        toast({
          title: "Report generated successfully",
          description: "Your colorful PDF report has been downloaded.",
          duration: 3000,
        });
        
        // Reset button text
        if (buttonSpan) {
          buttonSpan.textContent = "Download Report";
        }
      } catch (secondError) {
        console.error("Second PDF generation attempt failed:", secondError);
        
        // Reset button text
        const buttonSpan = document.querySelector(".download-button span");
        if (buttonSpan) {
          buttonSpan.textContent = "Download Failed";
          setTimeout(() => {
            if (buttonSpan) buttonSpan.textContent = "Download Report";
          }, 2000);
        }
        
        // Show error toast
        toast({
          title: "Failed to generate PDF",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive"
        });
      }
    }
  };

  // Generate text version of report for download
  const generateTextReport = (data: MonthlyReportData) => {
    let text = `WealthWise Monthly Finance Report\n`;
    text += `${data.monthName} ${data.year}\n\n`;
    
    // Summary section
    text += `EXPENSE SUMMARY\n`;
    text += `Total Expenses: ${formatCurrency(data.expenses.total)}\n`;
    text += `Number of Expenses: ${data.expenses.count}\n`;
    text += `Change from Previous Month: ${data.expenses.change}%\n\n`;
    
    // Categories
    text += `EXPENSE CATEGORIES\n`;
    data.expenses.byCategory.forEach((cat) => {
      text += `${cat.category}: ${formatCurrency(cat.amount)} (${cat.percentage}%)\n`;
    });
    text += `\n`;
    
    // Status
    text += `EXPENSE STATUS\n`;
    data.expenses.byStatus.forEach((stat) => {
      text += `${stat.status}: ${formatCurrency(stat.amount)} (${stat.percentage}%)\n`;
    });
    text += `\n`;
    
    // Savings
    text += `SAVINGS\n`;
    text += `Total Savings: ${formatCurrency(data.savings.total)}\n`;
    text += `Savings Rate: ${data.savings.savingsRate}%\n\n`;
    
    // Goals
    text += `GOALS\n`;
    text += `Active Goals: ${data.goals.active}\n`;
    text += `Completed Goals: ${data.goals.completed}\n`;
    if (data.goals.completedDetails.length > 0) {
      text += `\nCompleted Goal Details:\n`;
      data.goals.completedDetails.forEach((goal) => {
        text += `- ${goal.name} (${formatCurrency(goal.targetAmount)})\n`;
      });
    }
    text += `\n`;
    
    // Achievements
    text += `ACHIEVEMENTS\n`;
    text += `Achievements Earned: ${data.achievements.count}\n`;
    if (data.achievements.details.length > 0) {
      text += `\nAchievement Details:\n`;
      data.achievements.details.forEach((ach) => {
        text += `- ${ach.name} (${ach.coinsAwarded} coins)\n`;
      });
    }
    text += `\n`;
    
    // Insights
    text += `INSIGHTS & RECOMMENDATIONS\n`;
    data.insights.forEach((insight, index) => {
      text += `${index + 1}. ${insight}\n`;
    });
    
    return text;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => {
            setOpen(true);
            // Reset to current month/year when opening
            setMonth(new Date().getMonth().toString());
            setYear(new Date().getFullYear().toString());
          }}
        >
          <FileBarChart className="h-4 w-4" />
          <span>Monthly Report</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Financial Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
          <div className="space-y-2 w-full md:w-1/3">
            <Label htmlFor="month">Month</Label>
            <Select
              value={month}
              onValueChange={(value) => {
                setMonth(value);
                handleDateChange();
              }}
            >
              <SelectTrigger id="month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 w-full md:w-1/3">
            <Label htmlFor="year">Year</Label>
            <Select
              value={year}
              onValueChange={(value) => {
                setYear(value);
                handleDateChange();
              }}
            >
              <SelectTrigger id="year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full md:w-auto"
            onClick={handleDateChange}
          >
            Generate Report
          </Button>
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : reportData ? (
            <div id="monthly-report-content" className="space-y-6 p-5 bg-white rounded-lg">
              {/* Summary Header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  {reportData.monthName} {reportData.year}
                </h2>
                <p className="text-neutral-500">
                  Monthly Financial Summary
                </p>
              </div>
              
              {/* Expense & Savings Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-medium">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reportData.expenses.total)}
                    </div>
                    <div className="flex items-center mt-2 text-xs">
                      <Badge 
                        variant={reportData.expenses.change > 0 ? "destructive" : "outline"}
                        className={reportData.expenses.change <= 0 ? "text-success-600 border-success-600" : ""}
                      >
                        {reportData.expenses.change > 0 ? "+" : ""}
                        {reportData.expenses.change}% vs prev month
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-medium">Total Savings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reportData.savings.total)}
                    </div>
                    <div className="flex items-center mt-2 text-xs">
                      <Badge 
                        variant="outline"
                        className={reportData.savings.savingsRate >= 20 ? "text-success-600 border-success-600" : ""}
                      >
                        {reportData.savings.savingsRate}% savings rate
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-medium">Goals & Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500 text-xs">Completed Goals</span>
                        <Badge variant="secondary">{reportData.goals.completed}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500 text-xs">Achievements</span>
                        <Badge variant="secondary">{reportData.achievements.count}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Charts and Analysis */}
              <Tabs defaultValue="categories" id="report-tabs">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="categories">
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    Categories
                  </TabsTrigger>
                  <TabsTrigger value="status">
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Spending Status
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="categories" data-value="categories" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-md font-medium">Expense Breakdown by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      {reportData.expenses.byCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.expenses.byCategory}
                              dataKey="amount"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              fill="#8884d8"
                              paddingAngle={2}
                              label={({ category, percentage }) => `${category} (${percentage}%)`}
                            >
                              {reportData.expenses.byCategory.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={getCategoryColor(entry.category) || COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [formatCurrency(value as number), 'Amount']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-neutral-400">
                          No expense data available for this month
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Category Breakdown</h3>
                    <div className="space-y-3">
                      {reportData.expenses.byCategory.map((category) => (
                        <div key={category.category}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{category.category}</span>
                            <span className="text-sm">{formatCurrency(category.amount)} ({category.percentage}%)</span>
                          </div>
                          <Progress 
                            value={category.percentage} 
                            className="h-2" 
                            style={{ 
                              backgroundColor: 'rgba(0,0,0,0.05)',
                              '--progress-color': getCategoryColor(category.category) 
                            } as any}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="status" data-value="status" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-md font-medium">Spending by Status</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      {reportData.expenses.byStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={reportData.expenses.byStatus}
                            margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="status" 
                              angle={-45} 
                              textAnchor="end"
                              height={70}
                            />
                            <YAxis 
                              tickFormatter={(value) => formatShortCurrency(value)}
                            />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(value as number), 'Amount']}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill="#8884d8"
                              radius={[4, 4, 0, 0]}
                              name="Amount"
                            >
                              {reportData.expenses.byStatus.map((_, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={
                                    reportData.expenses.byStatus[index].status === 'necessary' 
                                      ? '#4ade80' 
                                      : reportData.expenses.byStatus[index].status === 'avoidable'
                                        ? '#f59e0b'
                                        : '#ef4444'
                                  } 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-neutral-400">
                          No expense data available for this month
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Status Breakdown</h3>
                    <div className="space-y-3">
                      {reportData.expenses.byStatus.map((status) => (
                        <div key={status.status}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium capitalize">{status.status}</span>
                            <span className="text-sm">{formatCurrency(status.amount)} ({status.percentage}%)</span>
                          </div>
                          <Progress 
                            value={status.percentage} 
                            className="h-2" 
                            style={{ 
                              backgroundColor: 'rgba(0,0,0,0.05)',
                              '--progress-color': status.status === 'necessary' 
                                ? '#4ade80' 
                                : status.status === 'avoidable'
                                  ? '#f59e0b'
                                  : '#ef4444'
                            } as any}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-medium">Insights & Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {reportData.insights.map((insight, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="font-bold text-primary">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Goals & Achievements */}
              {(reportData.goals.completed > 0 || reportData.achievements.count > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportData.goals.completed > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md font-medium">Completed Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {reportData.goals.completedDetails.map((goal, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="text-success-DEFAULT">✓</span>
                              <span>
                                {goal.name}
                                <span className="text-xs text-neutral-500 ml-1">
                                  ({formatCurrency(goal.targetAmount)})
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  
                  {reportData.achievements.count > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md font-medium">Achievements Earned</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {reportData.achievements.details.map((achievement, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="text-primary">🏆</span>
                              <span>
                                {achievement.name}
                                <span className="text-xs text-neutral-500 ml-1">
                                  (+{achievement.coinsAwarded} coins)
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
              <FileBarChart className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a month and year to generate your financial report</p>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          {reportData && (
            <Button 
              variant="outline" 
              className="download-button flex items-center gap-2"
              onClick={downloadReport}
            >
              <Download className="h-4 w-4" />
              <span>Download Report</span>
            </Button>
          )}
          <Button variant="default" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyReportModal;