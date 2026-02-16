import { getOrCreateUserConfig, updateUserConfig } from '../services/userConfig.service.js';

export async function getConfig(req, res) {
  const config = await getOrCreateUserConfig(req.user.id);
  res.json({
    success: true,
    data: config
  });
}

export async function updateConfig(req, res) {
  const updated = await updateUserConfig(req.user.id, req.body);
  res.json({
    success: true,
    data: updated
  });
}
