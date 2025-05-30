<template>
	<view class="story-event" v-if="visible">
		<view class="story-event-container">
			<!-- 头部 -->
			<view class="story-event-header">
				<view class="story-event-title">{{ event?.title || '剧情' }}</view>
				<view class="story-event-close" @click="handleClose">
					<uni-icons type="close" size="20" color="#999"></uni-icons>
				</view>
			</view>
			
			<!-- 内容区域 -->
			<view class="story-event-content">
				<!-- 显示图片（如果有） -->
				<image v-if="event?.imageUrl" class="story-event-image" :src="event.imageUrl" mode="aspectFill"></image>
				
				<!-- 显示内容 -->
				<view class="story-event-text" v-if="event?.content" v-html="formatContent(event.content)"></view>
				
				<!-- 任务提示（如果是任务类型） -->
				<view class="story-event-task" v-if="isTaskType">
					<uni-icons type="checkbox" size="20" color="#3a86ff"></uni-icons>
					<text>{{ getTaskDescription() }}</text>
				</view>
				
				<!-- 选项 - 新版格式 -->
				<view class="story-event-options" v-if="event?.options && event.options.length > 0">
					<view 
						class="story-event-option" 
						v-for="(option, index) in event.options" 
						:key="index"
						@click="handleOptionSelect(index)"
					>
						{{ option.text }}
					</view>
				</view>
				
				<!-- 选项 - 旧版格式 -->
				<view class="story-event-options" v-else-if="event?.content?.choices && event.content.choices.length > 0">
					<view 
						class="story-event-option" 
						v-for="(choice, index) in event.content.choices" 
						:key="index"
						@click="handleOptionSelect(index)"
					>
						{{ choice.text }}
					</view>
				</view>
				
				<!-- 继续按钮（非选项类型） -->
				<view 
					class="story-event-continue" 
					v-if="!hasOptions"
					@click="handleContinue"
				>
					<text>{{ getContinueButtonText() }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
	// 是否显示
	visible: {
		type: Boolean,
		default: false
	},
	// 当前事件
	event: {
		type: Object,
		default: null
	},
	// 剧情ID
	plotId: {
		type: String,
		default: ''
	}
});

// 事件
const emit = defineEmits(['complete', 'choice', 'close']);

// 判断是否有选项
const hasOptions = computed(() => {
	return props.event && 
	       ((props.event.options && props.event.options.length > 0) || 
	        (props.event.content && props.event.content.choices && props.event.content.choices.length > 0));
});

// 判断是否为任务类型
const isTaskType = computed(() => {
	if (!props.event) return false;
	const eventType = props.event.type || props.event.eventType;
	return eventType === 'TASK';
});

// 获取任务描述
const getTaskDescription = () => {
	if (!props.event) return '完成任务继续剧情';
	
	// 新版格式
	if (props.event.task && props.event.task.description) {
		return props.event.task.description;
	}
	
	// 旧版格式
	if (props.event.content && props.event.content.taskObjective) {
		return props.event.content.taskObjective;
	}
	
	return '完成任务继续剧情';
};

// 处理关闭
const handleClose = () => {
	// 发送关闭事件
	emit('close');
};

// 处理选项选择
const handleOptionSelect = (index) => {
	if (!props.event) return;
	
	// 发送选项事件
	emit('choice', {
		eventId: props.event._id,
		choiceIndex: index
	});
};

// 处理继续
const handleContinue = () => {
	if (!props.event) return;
	
	// 发送完成事件
	emit('complete', props.event._id);
};

// 格式化内容，处理换行
const formatContent = (content) => {
	if (!content) return '';
	
	// 检查content是否是对象（老格式）
	if (typeof content === 'object') {
		// 处理对话类型
		if (content.dialogues && content.dialogues.length > 0) {
			return content.dialogues.map(d => `<strong>${d.speaker || ''}:</strong> ${d.content || ''}`).join('<br><br>');
		}
		// 处理任务类型
		else if (content.taskObjective) {
			return content.taskObjective;
		}
		// 处理引导类型
		else if (content.guideInfo && content.guideInfo.guideText) {
			return content.guideInfo.guideText;
		}
		// 处理选项类型的内容
		else {
			return JSON.stringify(content);
		}
	}
	
	// 字符串类型直接替换换行符
	return content.replace(/\n/g, '<br>');
};

// 获取继续按钮文本
const getContinueButtonText = () => {
	if (!props.event) return '继续';
	
	// 获取事件类型，兼容旧版属性名
	const eventType = props.event.type || props.event.eventType || '';
	
	// 根据事件类型返回不同的按钮文本
	switch(eventType) {
		case 'TASK':
			return '完成任务';
		case 'GUIDE':
			return '我知道了';
		case 'REWARD':
			return '领取奖励';
		default:
			return '继续';
	}
};
</script>

<style lang="scss">
.story-event {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	animation: fadeIn 0.3s ease;
	
	.story-event-container {
		width: 90%;
		max-width: 600rpx;
		min-height: 300rpx;
		max-height: 80vh;
		background-color: #fff;
		border-radius: 16rpx;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
		animation: slideUp 0.3s ease;
	}
	
	.story-event-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx;
		border-bottom: 1rpx solid #f0f0f0;
		
		.story-event-title {
			font-size: 32rpx;
			font-weight: 600;
			color: #333;
		}
		
		.story-event-close {
			width: 40rpx;
			height: 40rpx;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
	
	.story-event-content {
		padding: 24rpx;
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}
	
	.story-event-image {
		width: 100%;
		height: 300rpx;
		border-radius: 12rpx;
		margin-bottom: 16rpx;
	}
	
	.story-event-text {
		font-size: 28rpx;
		color: #333;
		line-height: 1.6;
		margin-bottom: 24rpx;
	}
	
	.story-event-task {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 16rpx;
		background-color: #f5f8ff;
		border-radius: 8rpx;
		margin-bottom: 24rpx;
		
		text {
			font-size: 26rpx;
			color: #3a86ff;
		}
	}
	
	.story-event-options {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		margin-top: 16rpx;
		
		.story-event-option {
			padding: 20rpx 24rpx;
			background-color: #f5f5f5;
			border-radius: 8rpx;
			font-size: 28rpx;
			color: #333;
			text-align: center;
			transition: all 0.2s;
			
			&:active {
				background-color: #e0e0e0;
			}
		}
	}
	
	.story-event-continue {
		width: 100%;
		padding: 20rpx 0;
		background-color: #3a86ff;
		color: #fff;
		font-size: 28rpx;
		text-align: center;
		border-radius: 8rpx;
		margin-top: 16rpx;
		transition: all 0.2s;
		
		&:active {
			background-color: #2f6cd5;
		}
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes slideUp {
	from {
		transform: translateY(50rpx);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

/* 适配暗黑模式 */
@media (prefers-color-scheme: dark) {
	.story-event-container {
		background-color: #222;
	}
	
	.story-event-header {
		border-bottom-color: #333;
		
		.story-event-title {
			color: #fff;
		}
	}
	
	.story-event-text {
		color: #eee;
	}
	
	.story-event-task {
		background-color: #2d3748;
		
		text {
			color: #63b3ed;
		}
	}
	
	.story-event-options .story-event-option {
		background-color: #333;
		color: #eee;
		
		&:active {
			background-color: #444;
		}
	}
}
</style> 