import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { estructuraId, userId } = req.query;

    const where = {
      is_active: true,
      ...(estructuraId ? { estructura_id: estructuraId as string } : {}),
      ...(userId ? { id: userId as string } : {}),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        nombre_completo: true,
        user_position: true,
        is_active: true,
        estructura: {
          select: {
            nombre: true,
            custom_name: true,
          },
        },
      },
    });

    const formattedUsers = users.map(user => ({
      ...user,
      estructura: user.estructura?.custom_name || user.estructura?.nombre,
      is_active: user.is_active ? 'Activo' : 'Inactivo',
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Error en el informe de dotación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
} 