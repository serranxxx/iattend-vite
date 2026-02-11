import React, { useEffect, useRef } from 'react';
import { lighter } from '../../helpers/assets/functions';

const ConfettiComponent = ({ palette }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const confettiParticles = [];
        const colors = [palette.primary, palette.secondary, lighter(palette.primary, 0.5), lighter(palette.secondary, 0.5)]
        const confettiCount = 50; // Reducción de la cantidad de confeti
        const gravity = 0.5;
        const terminalVelocity = 5;
        const drag = 0.075;

        // Configuración del canvas
        canvas.width = window.innerWidth;
        canvas.height = 750;

        // Función para generar partículas de confeti
        function createParticle() {
            return {
                x: Math.random() * canvas.width, // posición horizontal aleatoria
                y: Math.random() * canvas.height - canvas.height, // posición vertical aleatoria
                color: colors[Math.floor(Math.random() * colors.length)], // color aleatorio
                rotation: Math.random() * 360,
                scale: Math.random() * 1,
                velocityX: Math.random() * 5 - 2.5,
                velocityY: Math.random() * 5 + gravity,
            };
        }

        // Crear partículas iniciales
        for (let i = 0; i < confettiCount; i++) {
            confettiParticles.push(createParticle());
        }

        // Dibujar y actualizar las partículas
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            confettiParticles.forEach((p) => {
                p.velocityY = Math.min(p.velocityY + gravity * drag, terminalVelocity); // agregar gravedad
                p.x += p.velocityX; // actualizar posición X
                p.y += p.velocityY; // actualizar posición Y

                // Reaparecer la partícula cuando salga de la pantalla
                if (p.y > canvas.height) {
                    p.x = Math.random() * canvas.width;
                    p.y = -10;
                }

                // Dibujar cada partícula de confeti
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); // usar un círculo para las partículas
                ctx.fill();
            });

            requestAnimationFrame(draw);
        }

        draw(); // Iniciar la animación

        // Limpiar el canvas al desmontar el componente
        return () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, zIndex: 99 }} />;
};

export default ConfettiComponent;