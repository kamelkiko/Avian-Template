import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@src/store/auth";
import AccessView from "@src/components/views/AccessView/AccessView.vue";
import HomeView from "@src/components/views/HomeView/HomeView.vue";
import PasswordResetView from "@src/components/views/PasswordResetView/PasswordResetView.vue";
import Chat from "@src/components/views/HomeView/Chat/Chat.vue";

const routes = [
  {
    path: "/chat/",
    name: "Home",
    alias: "/",
    component: HomeView,
    meta: { requiresAuth: true },
    children: [
      {
        path: "/chat/",
        alias: "/",
        name: "No-Chat",
        component: Chat,
      },
      {
        path: "/chat/:id/",
        name: "Chat",
        component: Chat,
      },
    ],
  },
  {
    path: "/access/:method/",
    name: "Access",
    component: AccessView,
    meta: { requiresGuest: true },
  },
  {
    path: "/reset/",
    name: "Password Reset",
    component: PasswordResetView,
    meta: { requiresAuth: true },
  },
];

// create the router
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Authentication guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Access', params: { method: 'sign-in' } });
    return;
  }
  
  // Check if route requires guest (unauthenticated) user
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Home' });
    return;
  }

// (router gaurd) when navigating in mobile screen from chat to chatlist,
// don't navigate to the previous chat navigate to the chatlist.
  if (from.name === "Chat" && to.name === "Chat" && window.innerWidth <= 967)
    next({ name: "No-Chat" });
  else next();
});

export default router;
