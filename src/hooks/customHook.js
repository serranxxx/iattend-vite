
import { useState } from "react";
import axios from "axios";

// Base URL para la primera API
const baseURL1 = "https://api.openweathermap.org/data/2.5/";
const baseURL2 = "http://localhost:4000/api";
const baseProd = "https://i-attend-22z4h.ondigitalocean.app/api"

export const useWeather = () => {
  const [response, setResponse] = useState(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const operation = async (params) => {
    try {
      setLoading(true);
      const result = await axios.request({
        ...params,
        baseURL: baseURL1, // Usar baseURL1 para esta API
      });
      setResponse(result);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return { response, error, loading, operation, setLoading };
};

export const useInvitation = () => {
  const [response, setResponse] = useState(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const operation = async (params) => {
    try {
      setLoading(true);
      const result = await axios.request({
        ...params,
        baseURL: baseProd
      });
      setResponse(result);

    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return { response, error, loading, operation, setLoading };
}