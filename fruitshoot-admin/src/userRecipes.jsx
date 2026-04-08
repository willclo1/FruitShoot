import * as React from "react";
import {
  List,
  Datagrid,
  FunctionField,
  useRecordContext,
  useDelete,
  useNotify,
  useRefresh,
} from "react-admin";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";

const BRAND = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#0F1F1D";
const MUTED = "rgba(15,31,29,0.55)";
const CARD_BG = "#FFFDF9";
const SOFT_BG = "#F7F4EF";
const BORDER = "rgba(31,76,71,0.10)";
const DELETE_RED = "#B8422E";

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

function formatFriendlyDate(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const tableListSx = {
  "& .RaList-main": { backgroundColor: "transparent", boxShadow: "none" },
  "& .RaDatagrid-table": { backgroundColor: "transparent" },
  "& .RaList-actions": { display: "none" },
};

const IdChip = () => {
  const record = useRecordContext();
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
        border: `1px solid rgba(31,76,71,0.13)`,
      }}
    />
  );
};

const TitleField = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Typography sx={{ color: TEXT_DARK, fontWeight: 700, fontSize: "0.9rem" }}>
      {record.title || `Recipe ${record.id}`}
    </Typography>
  );
};

const CreatedField = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Typography sx={{ color: MUTED, fontSize: "0.85rem", fontWeight: 500 }}>
      {formatFriendlyDate(record.created_at)}
    </Typography>
  );
};

const RowDeleteButton = ({ resource }) => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const notify = useNotify();
  const [deleteOne, { isPending }] = useDelete();

  if (!record) return null;

  const handleDelete = (event) => {
    event.stopPropagation();

    const confirmed = window.confirm("Are you sure you want to delete this item?");
    if (!confirmed) return;

    deleteOne(
      resource,
      { id: record.id, previousData: record },
      {
        mutationMode: "pessimistic",
        onSuccess: () => {
          notify("Deleted successfully", { type: "success" });
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
        border: `1px solid rgba(184,66,46,0.18)`,
        px: 1.5,
        py: 0.7,
        backgroundColor: "transparent",
        cursor: "pointer",
        textTransform: "none",
        "&:hover": {
          backgroundColor: "rgba(184,66,46,0.07)",
          border: `1px solid rgba(184,66,46,0.28)`,
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

export const UserRecipesList = () => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || "User";

  return (
    <Box sx={{ backgroundColor: CREAM, minHeight: "100%", p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton
          onClick={() => navigate("/users")}
          size="small"
          sx={{
            backgroundColor: "rgba(31,76,71,0.08)",
            color: BRAND,
            borderRadius: "10px",
            border: `1px solid rgba(31,76,71,0.13)`,
            "&:hover": { backgroundColor: "rgba(31,76,71,0.14)" },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: "1rem" }} />
        </IconButton>
        <Typography sx={{ color: MUTED, fontWeight: 600, fontSize: "0.85rem" }}>
          Back to Users
        </Typography>
      </Box>

      <Card
        sx={{
          borderRadius: "22px",
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          boxShadow: "none",
          mb: 2.5,
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
                {username}&rsquo;s Recipes
              </Typography>
              <Box
                sx={{
                  width: 64,
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
                Review recipe entries created by this user. Remove any recipes that should not remain stored.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end" }}>
              <Box
                sx={{
                  backgroundColor: "rgba(31,76,71,0.07)",
                  border: `1px solid rgba(31,76,71,0.12)`,
                  borderRadius: "14px",
                  px: 2,
                  py: 1.2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <RestaurantMenuOutlinedIcon sx={{ color: BRAND, fontSize: "1.1rem" }} />
                <Typography sx={{ color: BRAND, fontWeight: 700, fontSize: "0.85rem" }}>
                  Recipes
                </Typography>
              </Box>
              <Chip
                label={`User ID: ${userId}`}
                size="small"
                sx={{
                  backgroundColor: "rgba(31,76,71,0.06)",
                  color: MUTED,
                  fontWeight: 600,
                  borderRadius: "8px",
                  fontSize: "0.76rem",
                  border: `1px solid rgba(31,76,71,0.10)`,
                }}
              />
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
          <List
            resource="userRecipes"
            filter={{ user_id: userId }}
            perPage={25}
            pagination={false}
            title={false}
            sx={tableListSx}
          >
            <Datagrid bulkActionButtons={false} rowClick={false} sx={datagridSx} hover={false}>
              <FunctionField label="ID" render={() => <IdChip />} />
              <FunctionField label="Recipe Name" render={() => <TitleField />} />
              <FunctionField label="Created" render={() => <CreatedField />} />
              <FunctionField label="" render={() => <RowDeleteButton resource="userRecipes" />} />
            </Datagrid>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};