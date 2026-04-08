import * as React from "react";
import { Layout, MenuItemLink } from "react-admin";
import { Box, Typography } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import fruitShootLogo from "./assets/FruitShoot Logo.png";

// ── FruitShoot palette ───────────────────────────────────────────────────────
const BRAND = "#1F4C47";
const CREAM = "#FAF7F2";
const CARD_BG = "#FFFDF9";
const TEXT_DARK = "#0F1F1D";
const MUTED = "rgba(15,31,29,0.55)";
const BORDER = "rgba(31,76,71,0.10)";

const FruitShootMenu = () => (
  <Box
    sx={{
      height: "100%",
      backgroundColor: CARD_BG,
      borderRight: `1px solid ${BORDER}`,
      display: "flex",
      flexDirection: "column",
      py: 0,
    }}
  >
    <Box
      sx={{
        px: 3,
        pt: 3,
        pb: 2.5,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          component="img"
          src={fruitShootLogo}
          alt="FruitShoot Logo"
          sx={{
            width: 42,
            height: 42,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <Box>
          <Typography
            sx={{
              color: BRAND,
              fontWeight: 900,
              fontSize: "1.05rem",
              letterSpacing: "-0.3px",
              lineHeight: 1.1,
            }}
          >
            FruitShoot
          </Typography>
          <Typography
            sx={{
              color: MUTED,
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
            }}
          >
            Admin
          </Typography>
        </Box>
      </Box>
    </Box>

    <Box sx={{ px: 2, pt: 2, flex: 1 }}>
      <Typography
        sx={{
          color: MUTED,
          fontWeight: 700,
          fontSize: "0.68rem",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          px: 1,
          mb: 1,
        }}
      >
        Management
      </Typography>

      <MenuItemLink
        to="/users"
        primaryText="Users"
        leftIcon={<PeopleAltIcon sx={{ fontSize: "1.1rem" }} />}
        sx={{
          borderRadius: "12px",
          mb: 0.5,
          color: TEXT_DARK,
          fontWeight: 700,
          fontSize: "0.9rem",
          py: 1.2,
          px: 1.5,
          transition: "all 0.15s ease",
          WebkitTapHighlightColor: "transparent",
          "&.RaMenuItemLink-active": {
            backgroundColor: "rgba(31,76,71,0.09)",
            color: BRAND,
            "& .MuiListItemIcon-root": { color: BRAND },
          },
          "&:hover": {
            backgroundColor: "rgba(31,76,71,0.06)",
            color: BRAND,
          },
          "&:focus": {
            outline: "none",
            backgroundColor: "rgba(31,76,71,0.06)",
          },
          "&:focus-visible": {
            outline: `2px solid rgba(31,76,71,0.18)`,
            outlineOffset: "2px",
            backgroundColor: "rgba(31,76,71,0.06)",
          },
          "& .MuiTouchRipple-root": {
            display: "none",
          },
          "& .MuiListItemIcon-root": {
            color: MUTED,
            minWidth: "36px",
          },
        }}
      />
    </Box>

    <Box
      sx={{
        px: 3,
        py: 2,
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <Typography
        sx={{
          color: MUTED,
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.2px",
        }}
      >
        © {new Date().getFullYear()} FruitShoot
      </Typography>
    </Box>
  </Box>
);

export const AdminLayout = (props) => (
  <Layout
    {...props}
    menu={FruitShootMenu}
    sx={{
      "& .RaLayout-root": {
        backgroundColor: CREAM,
      },
      "& .RaLayout-content": {
        backgroundColor: CREAM,
        padding: 0,
      },
      "& .RaLayout-appFrame": {
        backgroundColor: CREAM,
      },
      "& .RaAppBar-root": {
        backgroundColor: BRAND,
        boxShadow: "none",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      },
      "& .RaAppBar-title": {
        fontWeight: 800,
        letterSpacing: "-0.3px",
        fontSize: "1rem",
      },
      "& .MuiButtonBase-root": {
        WebkitTapHighlightColor: "transparent",
      },
    }}
  />
);