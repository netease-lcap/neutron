import React from 'react';
import classnames from 'classnames';

import {
  useEventCallback,
  useDebounceCallback,
} from '@/shared/hooks';

import Popup from '@/components/Popup';

import Favicon from '../Favicon';
import Operation from '../Operation';

import { bookmarks } from '../../shared/local';

import { useDangerSharedContext } from '../../shared/hooks';

const useBookmarks = () => {
  return bookmarks.use(
    bookmarks.get,
    bookmarks.set,
  );
};

const Bookmark = (props = {}) => {
  const {
    className,
    current = {},
    onClick: propsOnClick,
    ...others
  } = props;
  const { src, title, favicon } = current;

  const [, setCurrent] = useDangerSharedContext('current');
  const [instance, setInstance] = useDangerSharedContext('instance');

  const cls = classnames({
    'neck-bookmark': true,
    [className]: !!className,
  });

  const onClick = useEventCallback((event = {}) => {
    const { ctrlKey, metaKey } = event;

    const matched = ctrlKey || metaKey;
    const more = { src, title, favicon };

    if (matched) {
      setCurrent(more);
    } else {
      instance.src = src;
      setCurrent((prev = {}) => ({ ...prev, ...more }));
    }

    propsOnClick && propsOnClick(event);
  });

  return (
    <div className={cls} onClick={onClick}>
      <Favicon className="favicon" src={favicon} />
      <div className="title">{ title }</div>
    </div>
  );
};

const OutboardNeck = React.forwardRef((props = {}, ref) => {
  const { className, ...others } = props;

  const [bookmarks = [], setBookmarks] = useBookmarks();

  const cls = classnames({
    'components-outboard-neck-render': true,
    [className]: !!className,
  });

  const renderBookmarks = () => {
    return bookmarks.map((item = {}, index) => {
      return (
        <Bookmark
          className="bookmarks-item"
          key={index}
          current={item}
        />
      );
    });
  };


  const rednerPopup = () => {
    return renderBookmarks();
  };

  const renderContent = () => {
    return (
      <div className="neck-content">
        <div className="content-bookmarks">
          { renderBookmarks() }
        </div>
        <Popup
          className="content-operations"
          poppedClassName="popped-bookmarks"
          render={rednerPopup}
        >
          <Operation
            className="operations-item"
            name="keyboard-double-arrow-right"
          />
        </Popup>
      </div>
    );
  };

  if (!bookmarks.length) {
    return null;
  }

  return (
    <div ref={ref} className={cls} {...others}>
      { renderContent() }
    </div>
  );
});

export default OutboardNeck;
