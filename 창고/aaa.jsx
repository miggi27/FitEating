import React, { useState, useRef } from "react";
import axios from "axios"
import { Dumbbell, BookText, Utensils, Settings as SettingsIcon, ScanLine, RotateCcw, Upload } from "lucide-react";
import ExerciseAnalyzer from "../frontend/src/features/exercise/ExerciseAnalyzer";
import BlogPage from "../frontend/src/pages/BlogPage";
import FoodCalculator from "../frontend/src/pages/FoodCalculator";
import Settings from "../frontend/src/pages/Settings";
import squatImg from "../frontend/src/assets/squat.jpg";

const App = () => {
  const [currentTab, setCurrentTab] = useState("exercise");
  
}