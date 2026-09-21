(function () {
  "use strict";

  if (typeof hycalHooks === "undefined") {
    return;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character];
    });
  }

  function sourceClass(event) {
    return (event.classNames || []).find(function (className) {
      return className.indexOf("hycal-calendar-") === 0;
    });
  }

  function eventTime(event, locale) {
    if (event.allDay) {
      return "All day";
    }
    if (!event.start) {
      return "";
    }
    var startTime = event.start.toLocaleTimeString(locale || undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (event.end && (event.end.getTime() - event.start.getTime() > 60000)) {
      var endTime = event.end.toLocaleTimeString(locale || undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return startTime + " - " + endTime;
    }
    return startTime;
  }

  function isPastDate(date) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  function hidesPast(settings) {
    return settings && (settings.hide_past === true || settings.hide_past === "true");
  }

  function eventsForDay(calendar, date) {
    var dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    return calendar
      .getEvents()
      .filter(function (event) {
        if (!event.start) return false;
        var overlaps = event.end
          ? (event.start < dayEnd && event.end > dayStart)
          : (event.start >= dayStart && event.start < dayEnd);
        return overlaps;
      })
      .sort(function (first, second) {
        return (first.start || 0) - (second.start || 0);
      });
  }

  function renderGridList(calendar, view, gridList) {
    if (!gridList) {
      return;
    }

    var events = calendar
      .getEvents()
      .filter(function (event) {
        return (
          event.start &&
          event.start < view.activeEnd &&
          (event.end || event.start) >= view.activeStart &&
          (!hidesPast(calendarElSettings(calendar)) || !isPastDate(event.end || event.start))
        );
      })
      .sort(function (first, second) {
        return (first.start || 0) - (second.start || 0);
      });
    var byDay = new Map();

    events.forEach(function (event) {
      var key = dateKey(event.start);
      if (!byDay.has(key)) {
        byDay.set(key, []);
      }
      byDay.get(key).push(event);
    });

    var todayKey = dateKey(new Date());
    var html = "";

    byDay.forEach(function (dayEvents, dayKey) {
      var parts = dayKey.split("-").map(Number);
      var day = new Date(parts[0], parts[1] - 1, parts[2]);
      var label = day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      var cards = dayEvents
        .map(function (event) {
          var className = sourceClass(event);
          return (
            '<div class="hycal-list-card' + (className ? " " + escapeHtml(className) : "") + '">' +
            '<div class="hycal-list-card-bar"></div>' +
            '<div><div class="hycal-list-card-time">' + escapeHtml(eventTime(event)) + "</div>" +
            '<div class="hycal-list-card-title">' + escapeHtml(event.title) + "</div></div></div>"
          );
        })
        .join("");

      html +=
        '<div class="hycal-daygroup">' +
        '<div class="hycal-day-cushion' + (dayKey === todayKey ? " hycal-today-cushion" : "") + '">' +
        escapeHtml(label) +
        "</div>" +
        '<div class="hycal-card-grid">' + cards + "</div></div>";
    });

    gridList.innerHTML = html || '<p class="hycal-list-empty">No events in this range.</p>';
  }

  function calendarElSettings(calendar) {
    return calendar.el.hycalSettings || {};
  }

  function configureCalendar(calendar, settings, calendarEl) {
    calendarEl.hycalSettings = settings;
    var layout = document.createElement("div");
    layout.className = "hycal-agenda-layout";
    calendarEl.parentNode.insertBefore(layout, calendarEl);
    layout.appendChild(calendarEl);

    var agenda = document.createElement("aside");
    agenda.className = "hycal-agenda-panel";
    agenda.innerHTML =
      '<h3 class="hycal-agenda-title"></h3>' +
      '<p class="hycal-agenda-count"></p>' +
      '<div class="hycal-agenda-body"></div>';
    layout.appendChild(agenda);

    var gridList = document.createElement("div");
    gridList.className = "hycal-grid-list";
    calendarEl.appendChild(gridList);

    function toggleGridList(view) {
      var isList = view.type.toLowerCase().indexOf("list") !== -1;
      calendarEl.classList.toggle("hycal-listview-active", isList);
      layout.classList.toggle("hycal-listview-layout-active", isList);
      if (isList) {
        renderGridList(calendar, view, gridList);
      }
    }

    function openAgendaFor(date) {
      if (!date) return;
      var dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      calendarEl.hycalSelectedDate = dayStart;

      var dayEvents = eventsForDay(calendar, dayStart).filter(function (event) {
        return !hidesPast(settings) || !isPastDate(event.end || event.start);
      });
      var locale = settings.locale || "en";
      var title = dayStart.toLocaleDateString(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      var titleEl = agenda.querySelector(".hycal-agenda-title");
      var countEl = agenda.querySelector(".hycal-agenda-count");
      var bodyEl = agenda.querySelector(".hycal-agenda-body");

      if (titleEl) titleEl.textContent = title;
      if (countEl) {
        countEl.textContent =
          dayEvents.length + (dayEvents.length === 1 ? " event" : " events");
      }

      if (bodyEl) {
        if (!dayEvents.length) {
          bodyEl.innerHTML = '<p class="hycal-agenda-empty">No events scheduled for this day.</p>';
        } else {
          bodyEl.innerHTML = dayEvents
            .map(function (event) {
              var className = sourceClass(event);
              var location = (event.extendedProps && event.extendedProps.location) || "";
              var url = event.url || (event.extendedProps && event.extendedProps.url) || "";

              var metaHtml = "";
              if (location) {
                metaHtml += '<div class="hycal-agenda-location">📍 ' + escapeHtml(location) + '</div>';
              }
              if (url && !url.includes("calendar.google.com")) {
                metaHtml += '<div class="hycal-agenda-link"><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">View details &rarr;</a></div>';
              }

              return (
                '<div class="hycal-agenda-row' + (className ? " " + escapeHtml(className) : "") + '">' +
                '<div class="hycal-agenda-bar"></div>' +
                '<div class="hycal-agenda-row-body">' +
                '<div class="hycal-agenda-time">' + escapeHtml(eventTime(event, locale)) + "</div>" +
                '<div class="hycal-agenda-event-title">' + escapeHtml(event.title) + "</div>" +
                metaHtml +
                "</div></div>"
              );
            })
            .join("");
        }
      }

      calendarEl.querySelectorAll(".fc-daygrid-day.hycal-selected").forEach(function (cell) {
        cell.classList.remove("hycal-selected");
      });
      var cellKey = dateKey(dayStart);
      var cell = calendarEl.querySelector('.fc-daygrid-day[data-date="' + cellKey + '"]');
      if (cell) {
        cell.classList.add("hycal-selected");
      }
      if (window.innerWidth <= 640) {
        agenda.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function onDatesSet(view) {
      toggleGridList(view);
      var selected = calendarEl.hycalSelectedDate;
      var inView = selected && view.activeStart && view.activeEnd && selected >= view.activeStart && selected < view.activeEnd;

      if (!inView) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (view.activeStart && view.activeEnd && today >= view.activeStart && today < view.activeEnd) {
          selected = today;
        } else if (view.currentStart) {
          selected = view.currentStart;
        } else {
          selected = new Date();
        }
      }
      openAgendaFor(selected);
    }

    calendarEl.hycalToggleGridList = toggleGridList;
    calendarEl.openAgendaFor = openAgendaFor;
    calendarEl.onDatesSet = onDatesSet;

    toggleGridList(calendar.view);

    var initDate = new Date();
    initDate.setHours(0, 0, 0, 0);
    if (calendar.view && calendar.view.activeStart && calendar.view.activeEnd && (initDate < calendar.view.activeStart || initDate >= calendar.view.activeEnd)) {
      initDate = calendar.view.currentStart || initDate;
    }
    openAgendaFor(initDate);
  }

  hycalHooks.addFilter("hycal.fullcalendarOptions", function (args, settings) {
    args.dayMaxEvents = 2;
    var previousDayCellClassNames = args.dayCellClassNames;
    args.dayCellClassNames = function (argument) {
      var classNames = previousDayCellClassNames
        ? previousDayCellClassNames(argument)
        : [];

      if (!Array.isArray(classNames)) {
        classNames = [classNames];
      }
      if (hidesPast(settings) && isPastDate(argument.date)) {
        classNames.push("hycal-day-past");
      }
      return classNames;
    };
    var previousDayCellDidMount = args.dayCellDidMount;
    args.dayCellDidMount = function (argument) {
      if (previousDayCellDidMount) {
        previousDayCellDidMount(argument);
      }
      if (hidesPast(settings) && isPastDate(argument.date)) {
        argument.el.classList.add("hycal-day-past");
        argument.el.style.display = "none";
      }
    };
    args.moreLinkClick = function (argument) {
      var calendarEl = argument.view.calendar.el;
      if (calendarEl.openAgendaFor) {
        calendarEl.openAgendaFor(argument.date);
      }
      return "none";
    };
    args.dateClick = function (argument) {
      if (argument.view.calendar.el.openAgendaFor) {
        argument.view.calendar.el.openAgendaFor(argument.date);
      }
    };
    var previousEventClick = args.eventClick;
    args.eventClick = function (info) {
      if (previousEventClick) {
        previousEventClick(info);
      }
      var calendarEl = info.view.calendar.el;
      if (calendarEl.openAgendaFor && info.event && info.event.start) {
        calendarEl.openAgendaFor(info.event.start);
      }
    };

    var previousViewDidMount = args.viewDidMount;
    args.viewDidMount = function (argument) {
      if (previousViewDidMount) {
        previousViewDidMount(argument);
      }
      var calendarEl = argument.view.calendar.el;
      if (calendarEl.onDatesSet) {
        calendarEl.onDatesSet(argument.view);
      }
    };

    var previousDatesSet = args.datesSet;
    args.datesSet = function (argument) {
      if (previousDatesSet) {
        previousDatesSet(argument);
      }
      var calendarEl = argument.view.calendar.el;
      if (calendarEl.onDatesSet) {
        calendarEl.onDatesSet(argument.view);
      }
    };

    var previousEventsSet = args.eventsSet;
    args.eventsSet = function (events) {
      if (previousEventsSet) {
        previousEventsSet(events);
      }
      document.querySelectorAll(".hycal-container").forEach(function (calendarEl) {
        if (calendarEl.hycalGridList && calendarEl.hycalGridList.render && calendarEl.hycalCalendar) {
          calendarEl.hycalGridList.render(calendarEl.hycalCalendar.view);
        }
        if (calendarEl.openAgendaFor && calendarEl.hycalSelectedDate) {
          calendarEl.openAgendaFor(calendarEl.hycalSelectedDate);
        }
      });
    };

    return args;
  });

  hycalHooks.addAction("hycal.afterRender", function (calendar, settings, calendarEl) {
    calendarEl.hycalCalendar = calendar;
    configureCalendar(calendar, settings, calendarEl);
    calendarEl.hycalGridList = {
      render: function (view) {
        renderGridList(calendar, view, calendarEl.querySelector(".hycal-grid-list"));
      },
    };
    calendarEl.hycalGridList.render(calendar.view);
  });
})();
