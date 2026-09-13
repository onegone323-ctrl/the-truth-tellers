import { useNavigate } from "react-router-dom";

// Native-style back: pop the history stack, or fall back to the parent route
// when this page was the first thing opened (deep link / cold start).
export default function useGoBack(fallback) {
  const navigate = useNavigate();
  return () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}