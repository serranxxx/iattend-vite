import React from "react";
import "./plans.css";
import { FaStar } from "react-icons/fa";
import { LuArmchair, LuClipboardList,   LuPalette, LuPartyPopper, LuPencilRuler, LuSend, LuSmartphone, LuTicket } from "react-icons/lu";



const Plans = () => {

  const plan_paperless = [
    {
      text: "Invitación Paperless",
      icon: LuSmartphone,
    },
    {
      text: "Diseño libre",
      icon: LuPalette,
    },
    {
      text: "Ediciones ilimitadas",
      icon: LuPencilRuler,
    },
    {
      text: "Evento público",
      icon: LuPencilRuler,
    },
    {
      text: "Confirmación manual",
      icon: LuPencilRuler,
    },
  ];
  
  const plan_pro = [
    {
      text: "Invitación Paperless",
      icon: LuSmartphone,
    },
    {
      text: "Diseño libre",
      icon: LuPalette,
    },
    {
      text: "Ediciones ilimitadas",
      icon: LuPencilRuler,
    },
    {
      text: "Evento público o privado",
      icon: LuPencilRuler,
    },
    {
      text: "Lista de asistencia",
      icon: LuClipboardList,
    },
    {
      text: "Mapa de mesas",
      icon: LuArmchair,
    },
    {
      text: "Envíos automáticos",
      icon: LuSend,
    },
    {
      text: "Pases digitales",
      icon: LuTicket,
    },
    {
      text: "3 Side events",
      icon: LuPartyPopper,
    },
  ];
  
  const plan_lite = [
    {
      text: "Invitación Paperless",
      icon: LuSmartphone,
    },
    {
      text: "Diseño libre",
      icon: LuPalette,
    },
    {
      text: "Ediciones ilimitadas",
      icon: LuPencilRuler,
    },
    {
      text: "Evento público o privado",
      icon: LuPencilRuler,
    },
    {
      text: "Lista de asistencia",
      icon: LuClipboardList,
    },
    {
      text: "Mapa de mesas",
      icon: LuArmchair,
    },
    {
      text: "1 Side event",
      icon: LuPartyPopper,
    },
  ];

  return (
    <div className="plans_cont">
      {/* PAPERLESS */}
      <div
        className={`plan_card`}
        style={{

          backgroundColor: "#FFF",
        }}
      >
        <img className="plan_image" src="/images/plan_paperless.png" alt="" />

        <span className="plan_description">
          La invitación digital esencial, simple y sin límites.
        </span>

        <div className="price_cont">
          <span>$849</span>
        </div>

        <div
          className="plan_info_cont"
        >
          {plan_paperless.map((i, index) => (
            <div key={index} className="plan_item">
              <i.icon />
              <span>{i.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PRO */}
      <div
        className={`plan_card`}
        style={{

          backgroundColor: "#414251",
          color: "#FFF",

        }}
      >
        <div className="card_relative_cont">
          <img className="plan_image" src="/images/plan_pro.png" alt="" />

          <span className="plan_description">
            La experiencia completa: invita, gestiona y automatiza.
          </span>

          <div className="price_cont" style={{ color: "#FDFCFD" }}>
            <span>$3,499</span>
          </div>

          <div
            className="plan_info_cont"
          >
            {plan_pro.map((i, index) => (
              <div
                key={index}
                className="plan_item"
                style={{ borderColor: "#20212B40" }}
              >
                <i.icon style={{ color: "#E0DAF4" }} />
                <span>{i.text}</span>
              </div>
            ))}
          </div>

          <div className="tag">
            <FaStar size={16} />
            <span>Más popular</span>
          </div>
        </div>
      </div>

      {/* LITE */}
      <div
        className={`plan_card`}
        style={{

          backgroundColor: "#E0DAF4",
        }}
      >
        <div className="card_relative_cont" style={{ border: "none" }}>
          <img className="plan_image" src="/images/plan_lite.png" alt="" />

          <span className="plan_description">
            Invitación digital con control de invitados.
          </span>

          <div className="price_cont" style={{ color: "#706787" }}>
            <div className="single_row">
              <span className="old_price">$3,125</span>
              <div className="price_tag">20% OFF</div>
            </div>
            <span>$2,499</span>
          </div>

          <div
            className="plan_info_cont"
          >
            {plan_lite.map((i, index) => (
              <div
                key={index}
                className="plan_item"
                style={{ borderColor: "#BDB4D040", color: "#706787" }}
              >
                <i.icon />
                <span>{i.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
