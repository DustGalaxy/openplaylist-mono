
<template>
	<header class=" bg-primary backdrop-blur-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="h-16 flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<!-- <img src="/logo192.png" alt="OpenPlaylist" class="h-8 w-8 rounded" /> -->
					<span class="font-semibold text-lg">OpenPlaylist</span>
				</div>

				<nav class="hidden md:flex space-x-4">
					<a class="text-sm text-gray-700 hover:text-blue-600" href="#">Home</a>
					<a class="text-sm text-gray-700 hover:text-blue-600" href="#">Playlists</a>
					<a class="text-sm text-gray-700 hover:text-blue-600" href="#">About</a>
				</nav>

				<div class="flex items-center space-x-3">
					<Button class="px-2" @click="change" >Sign in</Button>
				</div>
			</div>
		</div>
	</header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/06_shared/ui/Button.vue'


const mobileOpen = ref(false)

const change = () => {
	document.documentElement.style.setProperty('--p-primary-color', '#ff0000')
	console.log('clicked')
}
</script>

<style scoped>
/* Component-specific styles can go here if needed */
</style>
