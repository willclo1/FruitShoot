import * as React from "react";
import { Admin, Resource, CustomRoutes } from "react-admin";
import { Route } from "react-router-dom";
import GroupIcon from "@mui/icons-material/Group";

import dataProvider from "./dataProvider";
import { authProvider } from "./authProvider";
import { AdminLayout } from "./layout";
import AdminLogin from "./AdminLogin";
import { UserList } from "./users";
import { UserImagesList } from "./userImages";
import { UserRecipesList } from "./userRecipes";

export default function App() {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      layout={AdminLayout}
      loginPage={AdminLogin}
    >
      <Resource name="users" list={UserList} icon={GroupIcon} />
      <CustomRoutes>
        <Route path="/users/:userId/images" element={<UserImagesList />} />
        <Route path="/users/:userId/recipes" element={<UserRecipesList />} />
      </CustomRoutes>
    </Admin>
  );
}