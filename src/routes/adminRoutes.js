router.post('/icons/:id/replace', adminAuth, upload.single('file'), adminIconController.replaceIcon);
router.post('/icons/replace-app-icon', adminAuth, adminIconController.replaceAppIcon); 