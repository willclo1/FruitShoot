import * as React from "react";
import {
  List,
  Datagrid,
  FunctionField,
  Button,
  useRecordContext,
  useDelete,
  useNotify,
  useRefresh,
} from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
} from "@mui/material";
import CollectionsIcon from "@mui/icons-material/Collections";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

// ── FruitShoot palette ───────────────────────────────────────────────────────
const BRAND = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#0F1F1D";
const MUTED = "rgba(15,31,29,0.55)";
const CARD_BG = "#FFFDF9";
const SOFT_BG = "#F7F4EF";
const BORDER = "rgba(31,76,71,0.10)";
const DELETE_RED = "#B8422E";

// ── Shared datagrid hover fix ────────────────────────────────────────────────
const datagridSx = {
  "&& .RaDatagrid-headerCell": {
    backgroundColor: SOFT_BG,
    color: BRAND,
    fontWeight: 800,
    fontSize: "0.78rem",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    borderBottom: `1.5px solid ${BORDER}`,
    py: 1.8,
  },

  "&& .MuiTableRow-root": {
    backgroundColor: "rgba(255,255,255,0.96) !important",
  },

  "&& .MuiTableRow-root > td": {
    backgroundColor: "rgba(255,255,255,0.96) !important",
    color: TEXT_DARK,
    fontSize: "0.88rem",
    borderBottom: `1px solid ${BORDER}`,
    py: 1.5,
  },
};

// ── Styled action buttons ────────────────────────────────────────────────────
const ImagesButton = ({ record }) => {
  const navigate = useNavigate();
  if (!record) return null;

  return (
    <Button
      label="Images"
      onClick={() =>
        navigate(`/users/${record.id}/images`, {
          state: { username: record.username },
        })
      }
      sx={{
        backgroundColor: "rgba(31,76,71,0.07)",
        color: BRAND,
        fontWeight: 700,
        fontSize: "0.78rem",
        borderRadius: "10px",
        px: 1.5,
        py: 0.7,
        border: `1px solid rgba(31,76,71,0.14)`,
        textTransform: "none",
        letterSpacing: "0.1px",
        "&:hover": {
          backgroundColor: "rgba(31,76,71,0.13)",
          border: `1px solid rgba(31,76,71,0.22)`,
        },
        "& .MuiButton-startIcon": { mr: 0.5 },
      }}
    >
      <CollectionsIcon sx={{ fontSize: "0.95rem", mr: 0.5 }} />
    </Button>
  );
};

const RecipesButton = ({ record }) => {
  const navigate = useNavigate();
  if (!record) return null;

  return (
    <Button
      label="Recipes"
      onClick={() =>
        navigate(`/users/${record.id}/recipes`, {
          state: { username: record.username },
        })
      }
      sx={{
        backgroundColor: "rgba(31,76,71,0.07)",
        color: BRAND,
        fontWeight: 700,
        fontSize: "0.78rem",
        borderRadius: "10px",
        px: 1.5,
        py: 0.7,
        border: `1px solid rgba(31,76,71,0.14)`,
        textTransform: "none",
        letterSpacing: "0.1px",
        "&:hover": {
          backgroundColor: "rgba(31,76,71,0.13)",
          border: `1px solid rgba(31,76,71,0.22)`,
        },
      }}
    >
      <RestaurantMenuIcon sx={{ fontSize: "0.95rem", mr: 0.5 }} />
    </Button>
  );
};

// ── User avatar + name cell ──────────────────────────────────────────────────
const UserAvatarCell = ({ record }) => {
  if (!record) return null;
  const initials = (record.username || "?")
    .split(/[\s_]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar
        sx={{
          width: 36,
          height: 36,
          backgroundColor: "rgba(31,76,71,0.12)",
          color: BRAND,
          fontWeight: 800,
          fontSize: "0.82rem",
          border: "1.5px solid rgba(31,76,71,0.14)",
        }}
      >
        {initials || <PersonOutlineIcon sx={{ fontSize: "1rem" }} />}
      </Avatar>
      <Box>
        <Typography
          sx={{
            color: TEXT_DARK,
            fontWeight: 800,
            fontSize: "0.92rem",
            lineHeight: 1.2,
          }}
        >
          {record.username}
        </Typography>
        <Typography
          sx={{
            color: MUTED,
            fontWeight: 500,
            fontSize: "0.76rem",
          }}
        >
          {record.email}
        </Typography>
      </Box>
    </Box>
  );
};

const IdChip = ({ record }) => {
  if (!record) return null;
  return (
    <Chip
      label={`#${record.id}`}
      size="small"
      sx={{
        backgroundColor: "rgba(31,76,71,0.08)",
        color: BRAND,
        fontWeight: 700,
        borderRadius: "8px",
        fontSize: "0.78rem",
        height: "26px",
        border: "1px solid rgba(31,76,71,0.13)",
      }}
    />
  );
};

// ── Custom delete button so page doesn't redirect ────────────────────────────
const RowDeleteButton = ({ resource }) => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const notify = useNotify();
  const [deleteOne, { isPending }] = useDelete();

  if (!record) return null;

  const handleDelete = (event) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete ${record.username || "this user"}?`
    );
    if (!confirmed) return;

    deleteOne(
      resource,
      { id: record.id, previousData: record },
      {
        mutationMode: "pessimistic",
        onSuccess: () => {
          notify("User deleted successfully", { type: "success" });
          refresh();
        },
        onError: (error) => {
          notify(error?.message || "Delete failed", { type: "error" });
        },
      }
    );
  };

  return (
    <Box
      component="button"
      onClick={handleDelete}
      disabled={isPending}
      sx={{
        color: DELETE_RED,
        fontWeight: 700,
        fontSize: "0.8rem",
        borderRadius: "10px",
        border: "1px solid rgba(184,66,46,0.18)",
        px: 1.5,
        py: 0.7,
        backgroundColor: "transparent",
        cursor: "pointer",
        textTransform: "none",
        "&:hover": {
          backgroundColor: "rgba(184,66,46,0.07)",
          border: "1px solid rgba(184,66,46,0.28)",
        },
        "&:disabled": {
          opacity: 0.6,
          cursor: "not-allowed",
        },
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Box>
  );
};

// ── Shared table styles ──────────────────────────────────────────────────────
const tableListSx = {
  "& .RaList-main": { backgroundColor: "transparent", boxShadow: "none" },
  "& .RaDatagrid-table": { backgroundColor: "transparent" },
  "& .RaList-actions": { display: "none" },
  "& .RaToolbar-toolbar": { display: "none" },
};

// ── Page ─────────────────────────────────────────────────────────────────────
export const UserList = () => (
  <Box sx={{ backgroundColor: CREAM, minHeight: "100%", p: 3 }}>
    <Card
      sx={{
        borderRadius: "22px",
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "none",
        mb: 2.5,
        overflow: "visible",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                color: BRAND,
                fontWeight: 900,
                fontSize: "1.9rem",
                letterSpacing: "-0.5px",
                lineHeight: 1.05,
                mb: 0.5,
              }}
            >
              Users
            </Typography>
            <Box
              sx={{
                width: 48,
                height: 3.5,
                borderRadius: 999,
                backgroundColor: BRAND,
                mb: 1.5,
              }}
            />
            <Typography
              sx={{
                color: MUTED,
                fontSize: "0.93rem",
                lineHeight: 1.6,
                maxWidth: 480,
              }}
            >
              Manage registered accounts. View and remove uploaded images or recipes for any user.
            </Typography>
          </Box>

          <Box
            sx={{
              backgroundColor: "rgba(31,76,71,0.07)",
              border: "1px solid rgba(31,76,71,0.12)",
              borderRadius: "14px",
              px: 2,
              py: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <PersonOutlineIcon sx={{ color: BRAND, fontSize: "1.1rem" }} />
            <Typography
              sx={{
                color: BRAND,
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              All accounts
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>

    <Card
      sx={{
        borderRadius: "22px",
        backgroundColor: "rgba(255,255,255,0.96)",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 2px 16px rgba(31,76,71,0.05)",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <List perPage={25} pagination={false} title={false} sx={tableListSx}>
          <Datagrid bulkActionButtons={false} rowClick={false} sx={datagridSx} hover={false}>
            <FunctionField label="ID" render={(record) => <IdChip record={record} />} />
            <FunctionField label="User" render={(record) => <UserAvatarCell record={record} />} />
            <FunctionField label="Images" render={(record) => <ImagesButton record={record} />} />
            <FunctionField label="Recipes" render={(record) => <RecipesButton record={record} />} />
            <FunctionField label="" render={() => <RowDeleteButton resource="users" />} />
          </Datagrid>
        </List>
      </CardContent>
    </Card>
  </Box>
);