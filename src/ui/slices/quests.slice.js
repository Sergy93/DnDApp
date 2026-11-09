/**
 * Quests & Campaign Story state slice.
 */
export function createQuestsSlice() {
    return {
        questFilter: 'active', // 'active' | 'completed' | 'all'
        modalQuestOpen: false,
        editingQuestId: null,
        questForm: { title: '', desc: '', location: '', reward: '', status: 'active' },

        get filteredQuests() {
            const list = Array.isArray(this.data?.quests) ? this.data.quests : [];
            if (this.questFilter === 'active') {
                return list.filter(q => q.status !== 'completed');
            }
            if (this.questFilter === 'completed') {
                return list.filter(q => q.status === 'completed');
            }
            return list;
        },

        get activeQuestsCount() {
            const list = Array.isArray(this.data?.quests) ? this.data.quests : [];
            return list.filter(q => q.status !== 'completed').length;
        },

        get completedQuestsCount() {
            const list = Array.isArray(this.data?.quests) ? this.data.quests : [];
            return list.filter(q => q.status === 'completed').length;
        },

        openQuestModal(target = null) {
            if (target && typeof target === 'object') {
                this.editingQuestId = target.id;
                this.questForm = {
                    title: target.title || '',
                    desc: target.desc || '',
                    location: target.location || '',
                    reward: target.reward || '',
                    status: target.status || 'active'
                };
            } else {
                this.editingQuestId = null;
                this.questForm = {
                    title: '',
                    desc: '',
                    location: '',
                    reward: '',
                    status: 'active'
                };
            }
            this.modalQuestOpen = true;
        },

        handleSaveQuest() {
            const title = (this.questForm.title || '').trim();
            if (!title) return;
            if (!Array.isArray(this.data.quests)) this.data.quests = [];

            if (this.editingQuestId) {
                const idx = this.data.quests.findIndex(q => q.id === this.editingQuestId);
                if (idx >= 0) {
                    this.data.quests[idx] = {
                        ...this.data.quests[idx],
                        title,
                        desc: (this.questForm.desc || '').trim(),
                        location: (this.questForm.location || '').trim(),
                        reward: (this.questForm.reward || '').trim(),
                        status: this.questForm.status || 'active'
                    };
                    this.logEvent('🗺️', 'Quest Updated', `Updated quest "${title}".`);
                }
            } else {
                const newQuest = {
                    id: 'quest_' + Date.now() + Math.random().toString(36).substring(2, 6),
                    title,
                    desc: (this.questForm.desc || '').trim(),
                    location: (this.questForm.location || '').trim(),
                    reward: (this.questForm.reward || '').trim(),
                    status: this.questForm.status || 'active',
                    createdAt: new Date().toLocaleDateString()
                };
                this.data.quests.unshift(newQuest);
                this.logEvent('🗺️', 'New Quest Accepted', `Added quest "${title}".`);
            }
            this.modalQuestOpen = false;
            this.editingQuestId = null;
            this.saveState();
        },

        toggleQuestStatus(id) {
            if (!Array.isArray(this.data?.quests)) return;
            const q = this.data.quests.find(item => item.id === id);
            if (!q) return;
            q.status = q.status === 'completed' ? 'active' : 'completed';
            if (q.status === 'completed') {
                this.logEvent('✅', 'Quest Completed', `Marked quest "${q.title}" as completed!`);
            } else {
                this.logEvent('🗺️', 'Quest Reopened', `Reopened quest "${q.title}".`);
            }
            this.saveState();
        },

        async removeQuest(id) {
            if (!Array.isArray(this.data?.quests)) return;
            const q = this.data.quests.find(item => item.id === id);
            if (!q) return;
            const ok = await this.uiConfirm(`Do you want to delete the quest "${q.title}"?`, "Delete Quest", "🗑️", "Delete", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.quests = this.data.quests.filter(item => item.id !== id);
            this.logEvent('🗑️', 'Quest Deleted', `Deleted quest "${q.title}".`);
            this.saveState();
        },

        saveCampaignNotes() {
            this.saveState();
        }
    };
}
