import * as React from "react";
import { useState } from "react";
import { useLogin, useNotify } from "react-admin";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import fruitShootLogo from "./assets/FruitShoot Logo.png";

const BRAND = "#1F4C47";
const CREAM = "#FAF7F2";
const CARD_BG = "#FFFDF9";
const TEXT_DARK = "#0F1F1D";
const MUTED = "rgba(15,31,29,0.55)";
const BORDER = "rgba(31,76,71,0.10)";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login({ password });
    } catch (error) {
      notify(error?.message || "Invalid admin password", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: CREAM,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: "24px",
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 8px 30px rgba(31,76,71,0.08)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 3,
            }}
          >
            <Box
              component="img"
              src={fruitShootLogo}
              alt="FruitShoot Logo"
              sx={{
                width: 48,
                height: 48,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />

            <Box>
              <Typography
                sx={{
                  color: BRAND,
                  fontWeight: 900,
                  fontSize: "1.4rem",
                  lineHeight: 1.1,
                  letterSpacing: "-0.4px",
                }}
              >
                FruitShoot
              </Typography>
              <Typography
                sx={{
                  color: MUTED,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                }}
              >
                Admin Portal
              </Typography>
            </Box>
          </Box>

          <Typography
            sx={{
              color: TEXT_DARK,
              fontWeight: 900,
              fontSize: "1.6rem",
              lineHeight: 1.1,
              mb: 1,
            }}
          >
            Sign in
          </Typography>

          <Typography
            sx={{
              color: MUTED,
              fontSize: "0.95rem",
              lineHeight: 1.6,
              mb: 3,
            }}
          >
            Enter the admin password to continue.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
           <TextField
                fullWidth
                type="password"
                label="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={submitting}
                variant="outlined"
                InputLabelProps={{
                    sx: {
                    color: MUTED,
                    "&.Mui-focused": {
                        color: BRAND,
                    },
                    "&.MuiFormLabel-filled": {
                        color: MUTED,
                    },
                    },
                }}
                sx={{
                    mb: 2.5,
                    "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    backgroundColor: "#FFFFFF",
                    color: TEXT_DARK,
                    "& fieldset": {
                        borderColor: "rgba(31,76,71,0.14)",
                    },
                    "&:hover fieldset": {
                        borderColor: "rgba(31,76,71,0.24)",
                    },
                    "&.Mui-focused fieldset": {
                        borderColor: BRAND,
                        borderWidth: "2px",
                    },
                    "& input": {
                        color: TEXT_DARK,
                    },
                    "& input::placeholder": {
                        color: MUTED,
                        opacity: 1,
                    },
                    },
                    "& .MuiInputLabel-root": {
                    color: MUTED,
                    },
                    "& .MuiInputBase-input": {
                    color: TEXT_DARK,
                    },
                }}
                />

            <Button
              fullWidth
              type="submit"
              disabled={submitting || !password.trim()}
              variant="contained"
              sx={{
                backgroundColor: BRAND,
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.95rem",
                borderRadius: "14px",
                py: 1.25,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#173B37",
                  boxShadow: "none",
                },
              }}
            >
              {submitting ? "Signing in..." : "Log in"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}