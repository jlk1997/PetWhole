<template>
	<view class="uni-page-head">
		<view class="uni-page-head-title">{{title}}</view>
	</view>
</template>

<script>
	export default {
		name: 'page-head',
		props: {
			title: {
				type: String,
				default: ''
			}
		}
	}
</script>

<style>
	.uni-page-head {
		padding: 20rpx;
		text-align: center;
	}
	.uni-page-head-title {
		font-size: 36rpx;
		font-weight: bold;
	}
</style> 