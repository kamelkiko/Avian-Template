<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import { useAuthStore } from "@src/store/auth";
import useStore from "@src/store/store";

import FadeTransition from "@src/components/ui/transitions/FadeTransition.vue";

// Refactoring code:
// todo reorganize component structure
// todo refactor remove getters from utils file and add them to store folder.
// todo improve the video component.
// todo add shortcuts

// future features:
// todo add video calling
// todo add stories

// Accessability:
// todo improve the way you view messages.
// todo make multi-select more accessible.
// todo make dropdown menus more accessible.
// todo make modals more accessible.
// todo make lists (i.e conversations, contacts, calls) more accessible.

// SEO.
// todo improve seo.

// Performance:
// todo add dynamic imports.
// todo add chunking.

const authStore = useAuthStore();
const store = useStore();

// update localStorage with state changes
store.$subscribe((_mutation, state) => {
  localStorage.setItem("chat", JSON.stringify(state));
});

// Initialize the application
onMounted(async () => {
  // Initialize auth state
  await authStore.initialize();
  
  // Load initial data if authenticated
  if (authStore.isAuthenticated) {
    store.delayLoading = true;
    
    try {
      await Promise.all([
        store.loadConversations(),
        store.loadContacts(),
        store.loadArchivedConversations(),
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setTimeout(() => {
        store.delayLoading = false;
      }, 1000);
    }
  }
});

// the app height
const height = ref(`${window.innerHeight}px`);

// change the app height to the window hight.
const resizeWindow = () => {
  height.value = `${window.innerHeight}px`;
};

// and add the resize event when the component mounts.
onMounted(() => {
  window.addEventListener("resize", resizeWindow);
});

// remove the event when un-mounting the component.
onUnmounted(() => {
  window.removeEventListener("resize", resizeWindow);
});
</script>

<template>
  <div :class="{ dark: store.settings?.darkMode }">
    <div
      class="bg-white dark:bg-gray-800 transition-colors duration-500"
      :style="{ height: height }"
    >
      <router-view v-slot="{ Component }">
        <FadeTransition>
          <component :is="Component" />
        </FadeTransition>
      </router-view>
    </div>
  </div>
</template>
