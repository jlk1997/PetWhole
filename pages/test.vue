<template>
	<view>
		<view style="padding: 20px; background-color: red; color: white; text-align: center; margin: 20px; font-size: 18px;">
			这是测试(test)页面 - 如果看到这段文字，说明Vue渲染正常
		</view>
	</view>
</template>

<script>
export default {
	created() {
		console.log('TEST页面创建')
	},
	mounted() {
		console.log('TEST页面挂载')
	}
}
</script>

<style>
</style> 